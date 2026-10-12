import { describe, expect, test } from "vitest";
import { convexTest } from "convex-test";
import { makeFunctionReference } from "convex/server";
import schema from "../convex/schema";
import { flowsArtifactSchema } from "../src/contracts/flows";
import { figJamCanvasWritePlanSchema } from "../src/contracts/figma-export";
import { buildFigJamWritePlan, isCurrentFigJamSnapshot } from "../src/domain/figjam";
import { getFlowCanvasBoard } from "../src/domain/flows-canvas";

const modules = import.meta.glob("../convex/**/*.ts");
const create = makeFunctionReference<"mutation">("integrations/contentPlatforms:createFigJamArtifactExportJob");
const oldCreate = makeFunctionReference<"mutation">("integrations/contentPlatforms:createFigmaCanvasExportJob");
const claim = makeFunctionReference<"mutation">("integrations/contentPlatforms:claimFigmaExportJob");
const complete = makeFunctionReference<"mutation">("integrations/contentPlatforms:completeFigmaExportJob");
const fail = makeFunctionReference<"mutation">("integrations/contentPlatforms:failFigmaExportJob");
const get = makeFunctionReference<"query">("integrations/contentPlatforms:getFigmaExportJob");
function artifact(projectId = "project") {
  return flowsArtifactSchema.parse({
    apiVersion: "v1", artifactKind: "flowsArtifact", projectId, title: "Site", generatedAt: 1,
    flows: [{ id: "pages", title: "Pages", description: "Navigation", category: "Navigation", status: "Draft", screenCount: 3,
      steps: ["home", "pricing", "contact"].map((id, order) => ({ id, order, label: id, screenId: `screen-${id}` })) }],
    screens: ["home", "pricing", "contact"].map((id) => ({ id: `screen-${id}`, title: id, description: id, flowCount: 1, keyElements: [] })),
    canvas: { version: 1, boards: [{ flowId: "pages", positions: [{ stepId: "home", x: 300, y: 80 }, { stepId: "pricing", x: 60, y: 240 }, { stepId: "contact", x: 540, y: 240 }], edges: [{ source: "home", target: "pricing" }, { source: "home", target: "contact" }] }] },
  });
}

describe("canonical FigJam snapshots", () => {
  test("keeps branches, isolated nodes, positions and cycles rather than inferring adjacent edges", () => {
    const value = artifact();
    const board = value.canvas!.boards[0];
    board.edges.push({ source: "contact", target: "home" });
    const plan = figJamCanvasWritePlanSchema.parse(buildFigJamWritePlan(value, true));
    expect(plan.canvas.boards[0]).toEqual(board);
    expect(plan.canvas.boards[0].edges).not.toContainEqual({ source: "pricing", target: "contact" });
    board.edges = [];
    expect(figJamCanvasWritePlanSchema.parse(buildFigJamWritePlan(value)).canvas.boards[0].edges).toEqual([]);
  });
  test("materializes every legacy board without mutating the saved artifact", () => {
    const value = artifact();
    delete value.canvas;
    value.flows.push({ ...value.flows[0], id: "secondary" });
    const plan = figJamCanvasWritePlanSchema.parse(buildFigJamWritePlan(value, true));
    expect(plan.canvas.boards).toEqual(value.flows.map((flow) => getFlowCanvasBoard(flow)));
    expect(value.canvas).toBeUndefined();
    expect(buildFigJamWritePlan(value).kind).toBe("figjam-flow-map");
  });
  test("rejects missing, duplicated and foreign graph references before export", () => {
    const plan = figJamCanvasWritePlanSchema.parse(buildFigJamWritePlan(artifact()));
    for (const corrupt of [
      (value: typeof plan) => value.canvas.boards[0].positions.pop(),
      (value: typeof plan) => { value.canvas.boards[0].positions[0].x = Infinity; },
      (value: typeof plan) => value.canvas.boards.push(value.canvas.boards[0]),
      (value: typeof plan) => value.flows.push(value.flows[0]),
      (value: typeof plan) => value.canvas.boards[0].edges.push({ source: "missing", target: "home" }),
      (value: typeof plan) => value.canvas.boards[0].edges.push(value.canvas.boards[0].edges[0]),
      (value: typeof plan) => value.flows[0].steps.push(value.flows[0].steps[0]),
    ]) {
      const value = structuredClone(plan);
      corrupt(value);
      expect(figJamCanvasWritePlanSchema.safeParse(value).success).toBe(false);
    }
  });
  test("snapshot comparison ignores export metadata but detects semantic and geometry changes", () => {
    const value = artifact();
    const json = JSON.stringify(buildFigJamWritePlan(value));
    expect(isCurrentFigJamSnapshot(JSON.stringify({ ...value, figjamUrl: "https://www.figma.com/board/file", figjamExportedAt: 9 }), json)).toBe(true);
    value.canvas!.boards[0].positions[0].x++;
    expect(isCurrentFigJamSnapshot(JSON.stringify(value), json)).toBe(false);
    expect(isCurrentFigJamSnapshot(undefined, json)).toBe(false);
    expect(isCurrentFigJamSnapshot("{", json)).toBe(false);
  });
});

async function setup() {
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", { name: "Owner" });
    const projectId = await ctx.db.insert("projects", { userId, name: "Test", clientName: "Client", type: "websites", status: "active", startDate: 1, endDate: 2, progress: 0, createdAt: 1, updatedAt: 1 });
    const artifactId = await ctx.db.insert("projectAiArtifacts", { userId, projectId, module: "flows", kind: "flowsArtifact", title: "Site", status: "ready", contentFormat: "json", contentJson: JSON.stringify(artifact(String(projectId))), createdAt: 1, updatedAt: 1 });
    const connectionId = await ctx.db.insert("nativeIntegrationConnections", { userId, provider: "figma", status: "active", accountId: "figma-owner", createdAt: 1, updatedAt: 1 });
    return { userId, projectId, artifactId, connectionId };
  });
  const user = t.withIdentity({ subject: `${ids.userId}|session` });
  const input = { projectId: ids.projectId, artifactId: ids.artifactId, pairingCodeHash: "pair", pairingExpiresAt: Date.now() + 600000 };
  const claimInput = { pairingCodeHash: "pair", figmaUserId: "figma-owner", documentName: "Test", editorType: "figjam" as const, claimTokenHash: "claim", claimedAt: Date.now(), claimExpiresAt: Date.now() + 600000, supportedWritePlanKinds: ["figjam-canvas-map" as const] };
  return { t, user, ...ids, input, claimInput };
}

describe("authorized queued graph exports", () => {
  test("requires authentication, access and the current artifact", async () => {
    const { t, user, userId, projectId, input } = await setup();
    await expect(t.mutation(create, input)).rejects.toThrow();
    const stranger = await t.run((ctx) => ctx.db.insert("users", { name: "Stranger" }));
    await expect(t.withIdentity({ subject: `${stranger}|session` }).mutation(create, input)).rejects.toThrow(/authorized/);
    await t.run((ctx) => ctx.db.insert("projectAiArtifacts", { userId, projectId, module: "flows", kind: "flowsArtifact", title: "New", status: "ready", contentFormat: "json", contentJson: JSON.stringify(artifact(String(projectId))), createdAt: 2, updatedAt: 2 }));
    await expect(user.mutation(create, input)).rejects.toThrow(/replaced/);
  });
  test("old public creation cannot override the authoritative saved graph", async () => {
    const { t, user, input } = await setup();
    const result = await user.mutation(oldCreate, { ...input, screenId: "flow-map", exportKind: "figjam_flow_map", writePlanJson: JSON.stringify({ kind: "figjam-flow-map", flows: [] }) });
    const job = await t.run((ctx) => ctx.db.get(result.jobId));
    const plan = figJamCanvasWritePlanSchema.parse(JSON.parse(job!.writePlanJson));
    expect(plan.flows[0].steps).toHaveLength(3);
    expect(plan.canvas.boards[0].edges).toEqual(artifact().canvas!.boards[0].edges);
  });
  test("old plugins fail before claiming, while current plugins receive the immutable snapshot", async () => {
    const { t, user, input, claimInput, artifactId } = await setup();
    const result = await user.mutation(create, input);
    await expect(t.mutation(claim, { ...claimInput, supportedWritePlanKinds: undefined })).rejects.toThrow(/Update Stage Exporter/);
    expect((await user.query(get, { jobId: result.jobId })).status).toBe("requested");
    await t.run(async (ctx) => {
      const value = artifact(String(input.projectId));
      value.canvas!.boards[0].edges = [];
      await ctx.db.patch(artifactId, { contentJson: JSON.stringify(value), updatedAt: 3 });
    });
    const claimed = await t.mutation(claim, claimInput);
    expect(JSON.parse(claimed.writePlanJson).canvas.boards[0].edges).toHaveLength(2);
    expect((await user.query(get, { jobId: result.jobId })).snapshotOutdated).toBe(true);
  });
  test("rejects wrong editor/account, revoked Figma connection and competing active claims", async () => {
    const { t, user, input, claimInput, connectionId } = await setup();
    await user.mutation(create, input);
    await expect(t.mutation(claim, { ...claimInput, editorType: "figma" })).rejects.toThrow(/FigJam/);
    await expect(t.mutation(claim, { ...claimInput, figmaUserId: "other" })).rejects.toThrow(/same account/);
    await t.run((ctx) => ctx.db.patch(connectionId, { status: "disconnected" }));
    await expect(t.mutation(claim, claimInput)).rejects.toThrow(/Reconnect/);
    await t.run((ctx) => ctx.db.patch(connectionId, { status: "active" }));
    await t.mutation(claim, claimInput);
    await expect(t.mutation(claim, { ...claimInput, claimTokenHash: "competing" })).rejects.toThrow(/another plugin/);
    await expect(user.mutation(create, { ...input, pairingCodeHash: "new" })).rejects.toThrow(/already running/);
  });
  test("late or repeated completion/failure cannot clobber a completed export", async () => {
    const { t, user, input, claimInput } = await setup();
    const result = await user.mutation(create, input);
    await t.mutation(claim, claimInput);
    const done = { claimTokenHash: "claim", destinationNodeId: "1:2", destinationUrl: "https://www.figma.com/board/file", completedAt: Date.now() };
    await t.mutation(complete, done);
    await t.mutation(complete, { ...done, destinationNodeId: "wrong" });
    expect(await t.mutation(fail, { claimTokenHash: "claim", errorMessage: "late", failedAt: Date.now() })).toBeNull();
    const job = await user.query(get, { jobId: result.jobId });
    expect(job).toMatchObject({ status: "completed", destinationNodeId: "1:2", snapshotOutdated: false });
    await user.mutation(create, { ...input, pairingCodeHash: "new" });
    expect(await user.query(get, { jobId: result.jobId })).toMatchObject({ status: "requested", destinationUrl: null });
    expect(await t.mutation(fail, { claimTokenHash: "claim", errorMessage: "old lease", failedAt: Date.now() })).toBeNull();
  });
  test("revoked project access prevents lease renewal and shared export metadata writes", async () => {
    const { t, user, input, claimInput, artifactId, projectId } = await setup();
    await user.mutation(create, input);
    await t.mutation(claim, claimInput);
    const other = await t.run((ctx) => ctx.db.insert("users", { name: "New owner" }));
    await t.run((ctx) => ctx.db.patch(projectId, { userId: other }));
    const heartbeat = makeFunctionReference<"mutation">("integrations/contentPlatforms:heartbeatFigmaExportJob");
    await expect(t.mutation(heartbeat, { claimTokenHash: "claim", heartbeatAt: Date.now(), claimExpiresAt: Date.now() + 600000 })).rejects.toThrow(/authorized/);
    await t.mutation(complete, { claimTokenHash: "claim", destinationNodeId: "1:2", destinationUrl: "https://www.figma.com/board/file", completedAt: Date.now() });
    expect(JSON.parse((await t.run((ctx) => ctx.db.get(artifactId)))!.contentJson!)).not.toHaveProperty("figjamUrl");
    expect(await t.run((ctx) => ctx.db.query("artifactDestinations").collect())).toEqual([]);
  });
  test("outdated completion records its destination without marking the changed artifact exported", async () => {
    const { t, user, input, claimInput, artifactId } = await setup();
    const result = await user.mutation(create, input);
    await t.mutation(claim, claimInput);
    await t.run((ctx) => ctx.db.patch(artifactId, { contentJson: JSON.stringify({ ...artifact(String(input.projectId)), title: "Changed" }), updatedAt: 3 }));
    await t.mutation(complete, { claimTokenHash: "claim", destinationNodeId: "1:2", destinationUrl: "https://www.figma.com/board/file", completedAt: Date.now() });
    expect((await user.query(get, { jobId: result.jobId })).snapshotOutdated).toBe(true);
    expect(JSON.parse((await t.run((ctx) => ctx.db.get(artifactId)))!.contentJson!)).not.toHaveProperty("figjamUrl");
    expect(await t.run((ctx) => ctx.db.query("artifactDestinations").collect())).toEqual([]);
  });
});
