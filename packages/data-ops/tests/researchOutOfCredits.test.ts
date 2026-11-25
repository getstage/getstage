import { afterEach, describe, expect, test, vi } from "vitest";
import { convexTest } from "convex-test";
import { makeFunctionReference } from "convex/server";
import schema from "../convex/schema";
import stripeSchema from "../node_modules/@convex-dev/stripe/dist/component/schema";
import workflowSchema from "../node_modules/@convex-dev/workflow/dist/component/schema";

const modules = import.meta.glob("../convex/**/*.ts");
const stripeModules = import.meta.glob("../node_modules/@convex-dev/stripe/dist/component/**/*.js");
const workflowModules = import.meta.glob("../node_modules/@convex-dev/workflow/dist/component/**/*.js");

function setup() {
  const t = convexTest(schema, modules);
  t.registerComponent("stripe", stripeSchema, stripeModules);
  t.registerComponent("workflow", workflowSchema, workflowModules);
  return t;
}

const searchGroup = makeFunctionReference<"action">("workflows/research:searchGroup");
const collected = makeFunctionReference<"mutation">("workflows/research:collected");
const search = { id: "hero", title: "Hero", source: "details" as const, query: "hero section", platform: "web" as const };

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("Research when Details is out of credits", () => {
  test("a Details search that is refused for credits is skipped, other errors still fail", async () => {
    const t = setup();
    vi.stubEnv("DETAILS_MCP_TOKEN", "test-token");
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 429 })));
    await expect(t.action(searchGroup, { search })).resolves.toBeNull();
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 402 })));
    await expect(t.action(searchGroup, { search })).resolves.toBeNull();
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 500 })));
    await expect(t.action(searchGroup, { search })).rejects.toThrow("Details request failed with status 500.");
  });

  test("a run with every screen type skipped keeps going without UI patterns", async () => {
    const t = setup();
    const runId = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", { name: "Owner", plan: "pro" });
      const projectId = await ctx.db.insert("projects", { userId, name: "Test", clientName: "Client", type: "websites", status: "active", startDate: 1, endDate: 2, progress: 0, createdAt: 1, updatedAt: 1 });
      return ctx.db.insert("projectAiRuns", { userId, projectId, module: "research", title: "Research (AI tool)", status: "running", trigger: "agent", startedAt: 1, updatedAt: 1 });
    });
    await t.mutation(collected, { workflowId: "w1", result: { kind: "success", returnValue: "[]" }, context: { runId } });
    const { run, checkpoint } = await t.run(async (ctx) => ({
      run: await ctx.db.get(runId),
      checkpoint: await ctx.db.query("projectAiRunCheckpoints").first(),
    }));
    expect(run?.status).toBe("running");
    expect(checkpoint?.contentJson).toBe("[]");
  });
});
