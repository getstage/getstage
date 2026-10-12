import { afterEach, describe, expect, test, vi } from "vitest";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import { executeFigJamCanvasWritePlan } from "../../../apps/figma-exporter/src/figjamCanvas";
import { figJamCanvasWritePlanSchema } from "../src/contracts/figma-export";

const plan = () => figJamCanvasWritePlanSchema.parse({
  apiVersion: "v1", kind: "figjam-canvas-map", name: "Site", flows: [{ id: "main", title: "Main", description: "Pages", steps: [{ id: "home", label: "Home" }, { id: "pricing", label: "Pricing" }, { id: "isolated", label: "Isolated" }] }],
  canvas: { version: 1, boards: [{ flowId: "main", positions: [{ stepId: "home", x: 350, y: 80 }, { stepId: "pricing", x: 60, y: 240 }, { stepId: "isolated", x: 540, y: 240 }], edges: [{ source: "home", target: "pricing" }, { source: "pricing", target: "home" }] }] },
});

type MockNode = {
  id: string; type: string; name?: string; removed: boolean; parent?: MockNode; children: MockNode[]; text: Record<string, unknown>;
  x?: number; y?: number; connectorStart?: { endpointNodeId: string }; connectorEnd?: { endpointNodeId: string };
  appendChild: (child: MockNode) => void; resize: ReturnType<typeof vi.fn>; resizeWithoutConstraints: ReturnType<typeof vi.fn>;
  setPluginData: ReturnType<typeof vi.fn>; remove: () => void;
};
function mockFigma() {
  const all: MockNode[] = [];
  const node = (type: string): MockNode => {
    const value: MockNode = { id: String(all.length + 1), type, children: [], text: {}, removed: false,
      resize: vi.fn(), resizeWithoutConstraints: vi.fn(), setPluginData: vi.fn(),
      appendChild: (child) => { child.parent = value; value.children.push(child); },
      remove: () => { value.removed = true; value.children.forEach((child) => child.remove()); },
    };
    all.push(value);
    return value;
  };
  const api = {
    editorType: "figjam", loadFontAsync: vi.fn().mockResolvedValue(undefined),
    createSection: vi.fn(() => node("SECTION")), createShapeWithText: vi.fn(() => node("SHAPE_WITH_TEXT")), createConnector: vi.fn(() => node("CONNECTOR")),
    viewport: { center: { x: 500, y: 500 }, scrollAndZoomIntoView: vi.fn() },
    ui: { postMessage: vi.fn(), onmessage: undefined as undefined | ((message: unknown) => Promise<void>) },
    showUI: vi.fn(), currentUser: { id: "owner" }, root: { name: "Document" }, currentPage: { selection: [] }, fileKey: "file",
  };
  vi.stubGlobal("figma", api);
  return { api, all, node };
}
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("FigJam canvas adapter with mocked SDK", () => {
  test("creates bounded boards and exact directed edges, including cycles and isolated nodes", async () => {
    const { all } = mockFigma();
    const result = await executeFigJamCanvasWritePlan(plan(), []);
    const shapes = all.filter((node) => node.type === "SHAPE_WITH_TEXT");
    expect(shapes.map(({ name, x, y }) => ({ name, x, y }))).toEqual([{ name: "Home", x: 350, y: 80 }, { name: "Pricing", x: 60, y: 240 }, { name: "Isolated", x: 540, y: 240 }]);
    expect(all.filter((node) => node.type === "CONNECTOR").map((node) => [node.connectorStart?.endpointNodeId, node.connectorEnd?.endpointNodeId])).toEqual([[shapes[0].id, shapes[1].id], [shapes[1].id, shapes[0].id]]);
    expect(result.root.children).toHaveLength(1);
    expect(result.root.children[0].type).toBe("SECTION");
  });
  test("same step IDs in separate boards never cross-connect", async () => {
    const { all } = mockFigma();
    const value = plan();
    value.flows.push({ ...value.flows[0], id: "secondary" });
    value.canvas.boards.push({ ...value.canvas.boards[0], flowId: "secondary" });
    await executeFigJamCanvasWritePlan(value, []);
    for (const connector of all.filter((node) => node.type === "CONNECTOR")) {
      expect(all.find((node) => node.id === connector.connectorStart?.endpointNodeId)?.parent).toBe(connector.parent);
      expect(all.find((node) => node.id === connector.connectorEnd?.endpointNodeId)?.parent).toBe(connector.parent);
    }
  });
  test("invalid plans and missing fonts fail before creating any nodes", async () => {
    const { api, all } = mockFigma();
    const invalid = plan();
    invalid.canvas.boards[0].edges[0].target = "missing";
    await expect(executeFigJamCanvasWritePlan(invalid, [])).rejects.toThrow();
    expect(all).toHaveLength(0);
    api.loadFontAsync.mockRejectedValue(new Error("Missing font"));
    await expect(executeFigJamCanvasWritePlan(plan(), [])).rejects.toThrow(/Missing font/);
    expect(all).toHaveLength(0);
  });
});

async function plugin(completeFails = false, creationFails = false) {
  vi.resetModules();
  const { api, all, node } = mockFigma();
  const existing = node("EXISTING");
  if (creationFails) api.createConnector.mockImplementation(() => { throw new Error("Connector failure"); });
  vi.stubGlobal("__html__", "<html></html>");
  vi.stubGlobal("__STAGE_API_BASE__", "https://stage.invalid");
  const fetch = vi.fn(async (url: string, init: { body: string }) => {
    if (url.endsWith("/claim")) return { ok: true, json: async () => ({ jobId: "job", claimToken: "token", writePlan: plan() }) };
    if (url.endsWith("/complete") && completeFails) throw new Error("Response lost after commit");
    return { ok: true, json: async () => ({ status: "completed" }) };
  });
  vi.stubGlobal("fetch", fetch);
  await import("../../../apps/figma-exporter/src/code");
  await api.ui.onmessage!({ type: "export", pairingCode: "CODE123" });
  return { api, all, existing, fetch };
}

describe("plugin message lifecycle", () => {
  test("the bundled plugin executes with dynamic code generation disabled", async () => {
    const { build } = createRequire(new URL("../../../apps/figma-exporter/package.json", import.meta.url))("esbuild");
    const bundle = await build({ entryPoints: [new URL("../../../apps/figma-exporter/src/code.ts", import.meta.url).pathname], bundle: true, write: false, format: "iife", target: "es2017", define: { __STAGE_API_BASE__: JSON.stringify("https://stage.invalid") } });
    const { api } = mockFigma();
    const fetch = vi.fn(async (url: string) => ({ ok: true, json: async () => url.endsWith("/claim") ? { jobId: "job", claimToken: "token", writePlan: plan() } : { status: "completed" } }));
    runInNewContext(bundle.outputFiles[0].text, { figma: api, __html__: "<html></html>", fetch, setInterval, clearInterval }, { contextCodeGeneration: { strings: false, wasm: false }, timeout: 2000 });
    await api.ui.onmessage!({ type: "export", pairingCode: "CODE123" });
    expect(api.ui.postMessage).toHaveBeenLastCalledWith(expect.objectContaining({ status: "success" }));
  });
  test("declares graph support and confirms the created root without sharing OAuth/session tokens", async () => {
    const { api, fetch } = await plugin();
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toMatchObject({ supportedWritePlanKinds: ["figjam-canvas-map"] });
    const payload = JSON.parse(fetch.mock.calls[1][1].body);
    expect(payload.destinationUrl).toContain("/board/file");
    expect(api.ui.postMessage).toHaveBeenLastCalledWith(expect.objectContaining({ status: "success" }));
  });
  test("failed construction rolls back only nodes created by this export", async () => {
    const { all, existing, fetch } = await plugin(false, true);
    expect(existing.removed).toBe(false);
    expect(all.filter((node) => node !== existing).every((node) => node.removed)).toBe(true);
    expect(fetch.mock.calls.some(([url]) => url.endsWith("/fail"))).toBe(true);
  });
  test("a lost completion response never deletes a possibly committed diagram or marks it failed", async () => {
    const { api, all, fetch } = await plugin(true);
    expect(all.every((node) => !node.removed)).toBe(true);
    expect(fetch.mock.calls.some(([url]) => url.endsWith("/fail"))).toBe(false);
    expect(api.ui.postMessage).toHaveBeenLastCalledWith(expect.objectContaining({ status: "error", message: expect.stringContaining("Export created") }));
  });
});
