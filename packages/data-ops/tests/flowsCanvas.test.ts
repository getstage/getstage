import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { convexTest } from "convex-test";
import { makeFunctionReference } from "convex/server";
import schema from "../convex/schema";
import { flowsMarkdown } from "../../../apps/user-application/src/lib/project/projectExportMarkdown";
import { getEnabledProjectTabs } from "../../../apps/user-application/src/lib/project/projectTabs";
import { flowsArtifactSchema, type FlowsArtifact } from "../src/contracts/flows";
import { flowsCanvasEditSchema } from "../src/contracts/flows-canvas";
import { applyFlowsCanvasEdit, getFlowCanvasBoard, validateFlowsCanvas } from "../src/domain/flows-canvas";

const modules = import.meta.glob("../convex/**/*.ts");
const edit = makeFunctionReference<"mutation">("projectAi:editFlowsCanvas");
const update = makeFunctionReference<"mutation">("projectAi:updateFlowsArtifact");
const complete = makeFunctionReference<"mutation">("projectAi:completeFlowsRun");
function artifact(projectId = "project"): FlowsArtifact {
  return flowsArtifactSchema.parse({
    apiVersion: "v1", artifactKind: "flowsArtifact", projectId, title: "Project journeys", generatedAt: 1,
    flows: [{ id: "checkout", title: "Checkout", description: "Purchase an item", category: "Conversion", status: "Draft", screenCount: 3,
      steps: ["cart", "address", "payment"].map((id, order) => ({ id, order, label: id, screenId: `screen-${id}` })) }],
    screens: ["cart", "address", "payment"].map((id) => ({ id: `screen-${id}`, title: id, description: id, flowCount: 1, keyElements: [] })),
  });
}
const connect = { type: "connect" as const, flowId: "checkout", source: "cart", target: "payment" };

describe("canvas contracts and operations", () => {
  test("adapts legacy steps deterministically without mutating or migrating on read", () => {
    const value = artifact();
    expect(value.canvas).toBeUndefined();
    expect(getFlowCanvasBoard(value.flows[0])).toEqual(getFlowCanvasBoard(value.flows[0]));
    expect(getFlowCanvasBoard(value.flows[0]).edges).toEqual([{ source: "cart", target: "address" }, { source: "address", target: "payment" }]);
    expect(value.canvas).toBeUndefined();
  });
  test("connects and disconnects idempotently, preserving screen IDs", () => {
    const value = artifact();
    const connected = applyFlowsCanvasEdit(value, connect);
    expect(applyFlowsCanvasEdit(connected, connect)).toBe(connected);
    expect(connected.flows).toEqual(value.flows);
    expect(connected.canvas?.boards[0].edges).toContainEqual({ source: "cart", target: "payment" });
    const removed = applyFlowsCanvasEdit(connected, { ...connect, type: "disconnect" });
    expect(applyFlowsCanvasEdit(removed, { ...connect, type: "disconnect" })).toBe(removed);
    expect(removed.canvas?.boards[0].edges).toHaveLength(2);
  });
  test("rejects invalid endpoints and allows valid app navigation cycles", () => {
    expect(() => applyFlowsCanvasEdit(artifact(), { ...connect, target: "missing" })).toThrow(/different nodes/);
    expect(() => applyFlowsCanvasEdit(artifact(), { ...connect, target: "cart" })).toThrow(/different nodes/);
    expect(applyFlowsCanvasEdit(artifact(), { ...connect, source: "payment", target: "cart" }).canvas?.boards[0].edges).toHaveLength(3);
  });
  test("does not lose unrelated edits and rejects conflicting node moves", () => {
    const initial = artifact();
    const from = getFlowCanvasBoard(initial.flows[0]).positions[0];
    const moved = applyFlowsCanvasEdit(initial, { type: "move", flowId: "checkout", stepId: "cart", from, to: { x: 70, y: 80 } });
    expect(applyFlowsCanvasEdit(moved, connect).canvas?.boards[0].positions[0]).toMatchObject({ x: 70, y: 80 });
    expect(() => applyFlowsCanvasEdit(moved, { type: "move", flowId: "checkout", stepId: "cart", from, to: { x: 90, y: 80 } })).toThrow(/Someone moved/);
    expect(applyFlowsCanvasEdit(moved, { type: "move", flowId: "checkout", stepId: "cart", from, to: { x: 70, y: 80 } })).toBe(moved);
    const other = getFlowCanvasBoard(initial.flows[0]).positions[1];
    expect(applyFlowsCanvasEdit(moved, { type: "move", flowId: "checkout", stepId: "address", from: other, to: { x: 300, y: 90 } }).canvas?.boards[0].positions[0]).toMatchObject({ x: 70, y: 80 });
  });
  test("the engine Sitemap example satisfies the shared graph contract", () => {
    const source = readFileSync(new URL("../../../apps/stage-engine/src/flows/prompt.rs", import.meta.url), "utf8");
    const example = source.match(/const SITEMAP_SHAPE_EXAMPLE: &str = r#"([\s\S]*?)"#;/)?.[1];
    expect(example).toBeDefined();
    const value = flowsArtifactSchema.parse(JSON.parse(example ?? "{}"));
    expect(() => validateFlowsCanvas(value)).not.toThrow();
    expect(value.canvas?.boards[0].edges).toEqual([{ source: "home", target: "about" }, { source: "home", target: "pricing" }]);
  });
  test("navigation follows project category without changing the internal flows route", () => {
    expect(getEnabledProjectTabs(["flows"], "websites").find((tab) => tab.key === "flows")?.label).toBe("Sitemap");
    expect(getEnabledProjectTabs(["flows"], "web-apps").find((tab) => tab.key === "flows")?.label).toBe("Flows");
    expect(getEnabledProjectTabs(["flows"], "ios-apps").find((tab) => tab.key === "flows")?.label).toBe("Flows");
  });
  test("Markdown exports actual connections rather than an obsolete linear journey", () => {
    const value = applyFlowsCanvasEdit(artifact(), connect);
    expect(flowsMarkdown(value)).toContain("`cart` → `payment`");
    expect(flowsMarkdown(value)).not.toContain("1. cart");
    expect(flowsMarkdown(artifact())).toContain("1. cart");
  });
  test("rejects unsafe geometry and corrupt saved graph references", () => {
    expect(flowsCanvasEditSchema.safeParse({ type: "move", flowId: "checkout", stepId: "cart", from: { x: 0, y: 0 }, to: { x: Infinity, y: 10 } }).success).toBe(false);
    expect(flowsCanvasEditSchema.safeParse({ type: "move", flowId: "checkout", stepId: "cart", from: { x: 0, y: 0 }, to: { x: -1, y: 10 } }).success).toBe(false);
    const value = applyFlowsCanvasEdit(artifact(), connect);
    if (!value.canvas) throw new Error("Expected canvas");
    value.canvas.boards[0].edges.push({ source: "missing", target: "cart" });
    expect(() => validateFlowsCanvas(value)).toThrow(/invalid/);
  });
});

async function setup() {
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", { name: "Owner" });
    const projectId = await ctx.db.insert("projects", { userId, name: "Test", clientName: "Client", type: "websites", status: "active", startDate: 1, endDate: 2, progress: 0, createdAt: 1, updatedAt: 1 });
    const value = artifact(String(projectId));
    const artifactId = await ctx.db.insert("projectAiArtifacts", { userId, projectId, module: "flows", kind: "flowsArtifact", title: value.title, status: "ready", contentFormat: "json", contentJson: JSON.stringify(value), createdAt: 1, updatedAt: 1 });
    return { userId, projectId, artifactId };
  });
  const user = t.withIdentity({ subject: `${ids.userId}|session` });
  const input = { projectId: ids.projectId, artifactId: ids.artifactId, editJson: JSON.stringify(connect) };
  return { t, user, ...ids, input };
}

describe("authorized canvas persistence", () => {
  test("requires authentication and project access", async () => {
    const { t, input } = await setup();
    await expect(t.mutation(edit, input)).rejects.toThrow();
    const otherId = await t.run((ctx) => ctx.db.insert("users", { name: "Other" }));
    await expect(t.withIdentity({ subject: `${otherId}|session` }).mutation(edit, input)).rejects.toThrow(/authorized/);
  });
  test("persists connections across sessions and deduplicates repeats", async () => {
    const { t, user, userId, input, artifactId } = await setup();
    const first = await user.mutation(edit, input);
    const second = await t.withIdentity({ subject: `${userId}|another-session` }).mutation(edit, input);
    expect(second.updatedAt).toBe(first.updatedAt);
    const saved = await t.run((ctx) => ctx.db.get(artifactId));
    expect(JSON.parse(saved?.contentJson ?? "{}").canvas.boards[0].edges).toHaveLength(3);
  });
  test("protects canvas edits from stale whole-artifact saves", async () => {
    const { user, projectId, artifactId, input } = await setup();
    const result = await user.mutation(edit, input);
    await expect(user.mutation(update, { projectId, artifactId, contentJson: JSON.stringify(artifact(String(projectId))), expectedUpdatedAt: 1 })).rejects.toThrow(/changed/);
    await expect(user.mutation(update, { projectId, artifactId, contentJson: JSON.stringify(artifact(String(projectId))), expectedUpdatedAt: result.updatedAt })).rejects.toThrow(/canvas actions/);
    await user.mutation(update, { projectId, artifactId, contentJson: result.contentJson, expectedUpdatedAt: result.updatedAt });
  });
  test("versioned legacy saves reject stale snapshots, while old non-canvas clients remain compatible", async () => {
    const { user, projectId, artifactId } = await setup();
    const contentJson = JSON.stringify(artifact(String(projectId)));
    await user.mutation(update, { projectId, artifactId, contentJson, expectedUpdatedAt: 1 });
    await expect(user.mutation(update, { projectId, artifactId, contentJson, expectedUpdatedAt: 1 })).rejects.toThrow(/changed/);
    await user.mutation(update, { projectId, artifactId, contentJson });
  });
  test("canvas and whole-artifact edits pause during generation", async () => {
    const { t, user, projectId, userId, artifactId, input } = await setup();
    await t.run((ctx) => ctx.db.insert("projectAiRuns", { userId, projectId, module: "flows", title: "Generate", status: "running", trigger: "user", startedAt: Date.now(), updatedAt: Date.now() }));
    await expect(user.mutation(edit, input)).rejects.toThrow(/generation/);
    await expect(user.mutation(update, { projectId, artifactId, contentJson: JSON.stringify(artifact(String(projectId))), expectedUpdatedAt: 1 })).rejects.toThrow(/generation/);
  });
  test("generation input carries canonical category, including legacy aliases", async () => {
    const { t, user, userId, projectId } = await setup();
    await t.run(async (ctx) => {
      for (const [module, kind] of [["research", "researchArtifact"], ["strategy", "strategyArtifact"], ["moodboard", "moodboardArtifact"]] as const) {
        await ctx.db.insert("projectAiArtifacts", { userId, projectId, module, kind, title: kind, status: "ready", contentFormat: "json", contentJson: "{}", createdAt: 1, updatedAt: 1 });
      }
    });
    const query = makeFunctionReference<"query">("projectAi:getFlowsInput");
    for (const [type, expected] of [["websites", "websites"], ["web-apps", "web-apps"], ["ios-apps", "ios-apps"], ["web-design", "websites"], ["web-app", "web-apps"], ["app-design", "ios-apps"]] as const) {
      await t.run((ctx) => ctx.db.patch(projectId, { type }));
      expect((await user.query(query, { projectId })).projectCategory).toBe(expected);
    }
  });
  test("direct graph export creation still requires an active Figma connection", async () => {
    const { user, projectId, artifactId, input } = await setup();
    await user.mutation(edit, input);
    const create = makeFunctionReference<"mutation">("integrations/contentPlatforms:createFigmaCanvasExportJob");
    await expect(user.mutation(create, { projectId, artifactId, screenId: "flow-map", exportKind: "figjam_flow_map", writePlanJson: "{}", pairingCodeHash: "test", pairingExpiresAt: Date.now() + 1000 })).rejects.toThrow(/Connect Figma/);
  });
  test("manual add can append a board without replacing saved graph identity", async () => {
    const { user, projectId, artifactId, input } = await setup();
    const result = await user.mutation(edit, input);
    const added = JSON.parse(result.contentJson);
    added.flows.unshift({ ...added.flows[0], id: "additional" });
    await expect(user.mutation(complete, { projectId, title: added.title, contentJson: JSON.stringify(added) })).rejects.toThrow(/cannot add or remove/);
    await user.mutation(update, { projectId, artifactId, contentJson: JSON.stringify(added), expectedUpdatedAt: result.updatedAt });
  });
  test("AI and detail saves cannot replace saved screen mappings", async () => {
    const { t, user, projectId, artifactId, input } = await setup();
    const result = await user.mutation(edit, input);
    const changed = JSON.parse(result.contentJson);
    changed.flows[0].steps[0].screenId = "screen-payment";
    await expect(user.mutation(complete, { projectId, title: changed.title, contentJson: JSON.stringify(changed) })).rejects.toThrow(/screen mappings/);
    await expect(user.mutation(update, { projectId, artifactId, contentJson: JSON.stringify(changed), expectedUpdatedAt: result.updatedAt })).rejects.toThrow(/screen mappings/);
    expect((await t.run((ctx) => ctx.db.get(artifactId)))?.contentJson).toBe(result.contentJson);
    changed.flows[0].steps[0].screenId = "screen-cart";
    changed.screens.pop();
    await expect(user.mutation(complete, { projectId, title: changed.title, contentJson: JSON.stringify(changed) })).rejects.toThrow(/screen mappings/);
  });
  test("preserves saved graph on compatible AI completion and rejects destructive completion", async () => {
    const { t, user, projectId, artifactId, input } = await setup();
    await user.mutation(edit, input);
    const incompatible = artifact(String(projectId));
    incompatible.flows[0].steps = [];
    await expect(user.mutation(complete, { projectId, title: incompatible.title, contentJson: JSON.stringify(incompatible) })).rejects.toThrow(/nodes/);
    expect(await t.run((ctx) => ctx.db.get(artifactId))).not.toBeNull();
    const compatible = artifact(String(projectId));
    const result = await user.mutation(complete, { projectId, title: compatible.title, contentJson: JSON.stringify(compatible) });
    const saved = await t.run((ctx) => ctx.db.get(result.artifactId));
    expect(JSON.parse(saved?.contentJson ?? "{}").canvas.boards[0].edges).toHaveLength(3);
  });
  test("rejects edits to a replaced artifact", async () => {
    const { t, user, input, userId, projectId } = await setup();
    await t.run((ctx) => ctx.db.insert("projectAiArtifacts", { userId, projectId, module: "flows", kind: "flowsArtifact", title: "Replacement", status: "ready", contentFormat: "json", contentJson: JSON.stringify(artifact(String(projectId))), createdAt: 10, updatedAt: 10 }));
    await expect(user.mutation(edit, input)).rejects.toThrow(/replaced/);
  });
});
