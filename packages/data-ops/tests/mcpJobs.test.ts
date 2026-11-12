import { describe, expect, test } from "vitest";
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

const listArtifacts = makeFunctionReference<"query">("projectAi:listArtifactsForApi");
const addToMoodboard = makeFunctionReference<"mutation">("workflows/moodboardImport:addToMoodboard");
const importFinished = makeFunctionReference<"mutation">("workflows/moodboardImport:finished");

async function seedProject(t: ReturnType<typeof setup>, runStatus: "running" | "cancelled" = "running") {
  return t.run(async (ctx) => {
    const ownerId = await ctx.db.insert("users", { name: "Owner", plan: "pro" });
    const strangerId = await ctx.db.insert("users", { name: "Stranger", plan: "pro" });
    const projectId = await ctx.db.insert("projects", { userId: ownerId, name: "Test", clientName: "Client", type: "web-apps", status: "active", startDate: 1, endDate: 2, progress: 0, createdAt: 1, updatedAt: 1 });
    const runId = await ctx.db.insert("projectAiRuns", { userId: ownerId, projectId, module: "moodboard", title: "Moodboard import (AI tool)", status: runStatus, trigger: "agent", startedAt: 1, updatedAt: 1 });
    return { ownerId, strangerId, projectId, runId };
  });
}

describe("MCP project access", () => {
  test("saved results are read with the same access check as saves: owner yes, stranger no", async () => {
    const t = setup();
    const { ownerId, strangerId, projectId } = await seedProject(t);
    await expect(t.query(listArtifacts, { userId: ownerId, projectId })).resolves.toEqual([]);
    await expect(t.query(listArtifacts, { userId: strangerId, projectId })).rejects.toThrow("Not authorized.");
  });
});

describe("cancelled moodboard import", () => {
  const reference = { id: "url-a", title: "a.png", imageUrl: "https://cdn.example.com/a.png", source: "url" };

  test("adds nothing and charges nothing once the run is cancelled", async () => {
    const t = setup();
    const { ownerId, projectId, runId } = await seedProject(t, "cancelled");
    await expect(
      t.mutation(addToMoodboard, { userId: ownerId, projectId, runId, referencesJson: JSON.stringify([reference]), importMode: "url" }),
    ).rejects.toThrow("The import was cancelled.");
    const { artifacts, ledger, run } = await t.run(async (ctx) => ({
      artifacts: await ctx.db.query("projectAiArtifacts").collect(),
      ledger: await ctx.db.query("creditLedger").collect(),
      run: await ctx.db.get(runId),
    }));
    expect(artifacts).toEqual([]);
    expect(ledger).toEqual([]);
    expect(run?.status).toBe("cancelled");
  });

  test("the job's failure doesn't turn a cancelled run into a failed one", async () => {
    const t = setup();
    const { runId } = await seedProject(t, "cancelled");
    await t.mutation(importFinished, { workflowId: "w1", result: { kind: "failed", error: "The import was cancelled." }, context: { runId } });
    const run = await t.run((ctx) => ctx.db.get(runId));
    expect(run?.status).toBe("cancelled");
  });
});
