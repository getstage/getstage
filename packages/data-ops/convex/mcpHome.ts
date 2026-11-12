import { v } from "convex/values";
import { query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { getPortalConfigByProjectId, requireAuthUser, requireProjectAccessOrNull } from "./_helpers";
import { listAccessibleProjectDocsForUser } from "./domain/projects/readModel";
import { WORKFLOW_STEPS } from "../src/contracts/desktop-api/project";
import { resolveProjectCategory } from "./lib/projects/domain/projectCategory";

// The 6 project steps in the Mac app's order, with where each step's result and runs are stored.
const STEPS = [
  { label: "Research", artifact: ["research", "researchArtifact"], runs: ["research"] },
  { label: "Strategy", artifact: ["strategy", "strategyArtifact"], runs: ["strategy"] },
  { label: "Moodboard", artifact: ["moodboard", "moodboardArtifact"], runs: ["moodboard", "styleguide"] },
  { label: "Flows", artifact: ["flows", "flowsArtifact"], runs: ["flows"] },
  { label: "Wireframes", artifact: ["generate", "wireframesArtifact"], runs: ["generate"] },
  { label: "Assets", artifact: ["delivery", "assetsArtifact"], runs: ["delivery"] },
] as const;

type StepStatus = "done" | "running" | "open";

async function stepStatuses(ctx: QueryCtx, projectId: Id<"projects">): Promise<StepStatus[]> {
  const runs = await ctx.db.query("projectAiRuns").withIndex("by_project", (q) => q.eq("projectId", projectId)).collect();
  const running = new Set<string>(runs.filter((run) => run.status === "running").map((run) => run.module));
  return Promise.all(STEPS.map(async (step) => {
    if (step.runs.some((module) => running.has(module))) return "running";
    const [module, kind] = step.artifact;
    const artifacts = await ctx.db
      .query("projectAiArtifacts")
      .withIndex("by_project_module", (q) => q.eq("projectId", projectId).eq("module", module))
      .collect();
    return artifacts.some((artifact) => artifact.kind === kind) ? "done" : "open";
  }));
}

// Projects in one workspace (the owner's projects this user can open), newest first, with step progress.
export const listProjectProgress = query({
  args: { ownerUserId: v.string() },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);
    const projects = (await listAccessibleProjectDocsForUser(ctx, user._id))
      .map(({ project }) => project)
      .filter((project) => String(project.userId) === args.ownerUserId)
      .sort((a, b) => b.updatedAt - a.updatedAt);
    return Promise.all(projects.map(async (project) => ({
      id: String(project._id),
      name: project.name,
      type: project.type,
      updatedAt: project.updatedAt,
      steps: (await stepStatuses(ctx, project._id)).map((status, index) => ({ label: STEPS[index]?.label ?? "", status })),
    })));
  },
});

// One project for the web project view's header; null once it's deleted or not shared with this user.
// enabledSteps defaults the same way as for the Mac app.
export const getProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const access = await requireProjectAccessOrNull(ctx, args.projectId);
    if (!access) return null;
    const { name, clientName, type, enabledSteps } = access.project;
    const portal = await getPortalConfigByProjectId(ctx, args.projectId);
    return {
      name,
      clientName,
      category: resolveProjectCategory(type),
      enabledSteps: enabledSteps ?? [...WORKFLOW_STEPS],
      portalUrl: portal?.isEnabled ? portal.shareUrl : null,
    };
  },
});
