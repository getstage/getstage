import { v } from "convex/values";
import { internal } from "../../../_generated/api";
import type { Id } from "../../../_generated/dataModel";
import type { ActionCtx, MutationCtx, QueryCtx } from "../../../_generated/server";
import { requireProjectAccessForUserId } from "../../../_helpers";
import { detailsSectionSchema } from "../../../../src/contracts/research";
import { referenceSearches, takeUniqueScreens, type ReferenceGroup, type ReferenceScreen, type ReferenceSearch } from "../../../../src/domain/researchReferences";
import { CREDIT_COSTS, requireCredits } from "../../credits/service";
import { resolveProjectCategory } from "../../projects/domain/projectCategory";
import { searchDetailsInspirations } from "../../references/details";
import { searchReferoScreens } from "../../references/refero";
import { upsertContextRecord } from "../domain/contextStore";
import { getContextRecord } from "../domain/records";
import { createRunRecord, findRunningRunForProjectModule } from "../domain/runStore";
import { now } from "../domain/time";
import { jobs } from "../../../workflows/jobs";
import { vWorkflowId, type WorkflowCtx } from "@convex-dev/workflow";
import { vResultValidator, type RunResult } from "@convex-dev/workpool";

// Research for AI tools (MCP), done the way Stage for Mac does it: the project's Research form
// (`projectAiContexts`, shared with the Mac form), then Stage collects the UI pattern screens itself
// (Refero for apps, Details for websites) and keeps them on the run; the AI writes the analysis.

type Access = { userId: Id<"users">; projectId: Id<"projects"> };
const access = { userId: v.id("users"), projectId: v.id("projects") };

export const researchInputsForApiArgs = access;

/** The Research form as the Mac shows it; screenTypes are its "Screens to analyze". */
export async function researchInputsForApiHandler(ctx: QueryCtx, args: Access) {
  const { project } = await requireProjectAccessForUserId(ctx, args);
  const context = await getContextRecord(ctx, args.projectId);
  return {
    projectType: resolveProjectCategory(project.type),
    industry: context?.industry ?? null,
    website: context?.clientWebsite ?? null,
    brief: context?.brief ?? null,
    competitorUrls: context?.competitorUrls ?? [],
    screenTypes: context?.detailsSections ?? [],
  };
}

export const saveResearchInputsForApiArgs = {
  ...access,
  industry: v.string(),
  website: v.optional(v.string()),
  brief: v.string(),
  competitorUrls: v.array(v.string()),
  screenTypes: v.array(v.string()),
};

export async function saveResearchInputsForApiHandler(
  ctx: MutationCtx,
  args: Access & { industry: string; website?: string; brief: string; competitorUrls: string[]; screenTypes: string[] },
) {
  await requireProjectAccessForUserId(ctx, args);
  const context = await getContextRecord(ctx, args.projectId);
  await upsertContextRecord(ctx, {
    userId: args.userId,
    projectId: args.projectId,
    industry: args.industry,
    clientWebsite: args.website,
    brief: args.brief,
    competitorUrls: args.competitorUrls,
    detailsSections: args.screenTypes.map((type) => detailsSectionSchema.parse(type)),
    referenceUrls: context?.referenceUrls ?? [],
  });
}

const searchValidator = v.object({
  id: v.string(),
  title: v.string(),
  source: v.union(v.literal("refero"), v.literal("details")),
  platform: v.union(v.literal("web"), v.literal("ios")),
  query: v.string(),
});

export const startResearchForApiArgs = access;

/**
 * Checks the form and credits, opens the Research run (the Mac and web show it in progress) and starts the job
 * that collects the UI pattern screens. Returns at once; the AI tool follows the run with get_run_status.
 */
export async function startResearchForApiHandler(ctx: MutationCtx, args: Access) {
  const { project } = await requireProjectAccessForUserId(ctx, args);
  const context = await getContextRecord(ctx, args.projectId);
  if (!context?.industry || !context.brief) {
    throw new Error("Save the Research form first (set_research_inputs): industry and brief are needed.");
  }
  await requireCredits(ctx, project.userId, CREDIT_COSTS.researchFallback);
  const timestamp = now();
  const running = await findRunningRunForProjectModule(ctx, args.projectId, "research");
  if (running) {
    await ctx.db.patch(running._id, { status: "failed", errorMessage: "Replaced by a new Research run.", completedAt: timestamp, updatedAt: timestamp });
  }
  const runId = await createRunRecord(ctx, {
    userId: args.userId,
    projectId: args.projectId,
    module: "research",
    title: "Research (AI tool)",
    status: "running",
    trigger: "agent",
  });
  const searches = referenceSearches({
    category: resolveProjectCategory(project.type),
    industry: context.industry,
    brief: context.brief,
    notes: context.notes,
    screenTypes: context.detailsSections ?? [],
  });
  await jobs.start(ctx, internal.workflows.research.collect, { runId, searches }, {
    onComplete: internal.workflows.research.collected,
    context: { runId },
  });
  return { runId: String(runId), status: "running" as const };
}

export const searchReferenceGroupForApiArgs = { search: searchValidator };

/** One step of the job: the screens for one screen type (Refero for apps, Details for websites). */
export async function searchReferenceGroupForApiHandler(_ctx: ActionCtx, { search }: { search: ReferenceSearch }): Promise<ReferenceScreen[]> {
  const found = search.source === "details" ? await searchDetailsInspirations(search.query) : await searchReferoScreens(search.query, search.platform);
  return found.map(({ id, title, productName, sourceUrl, thumbnailUrl }) => ({ id, title, productName, sourceUrl, thumbnailUrl }));
}

export const collectResearchReferencesArgs = { runId: v.id("projectAiRuns"), searches: v.array(searchValidator) };

/** The job: every screen type searched in parallel (within the job pool's limit), each search retried on errors. */
export async function collectResearchReferencesHandler(
  step: WorkflowCtx,
  args: { runId: Id<"projectAiRuns">; searches: ReferenceSearch[] },
): Promise<string> {
  const found = await Promise.all(args.searches.map((search) => step.runAction(internal.workflows.research.searchGroup, { search })));
  const unique = takeUniqueScreens(found);
  const groups: ReferenceGroup[] = args.searches.map((search, index) => ({ id: search.id, title: search.title, screens: unique[index] ?? [] }));
  return JSON.stringify(groups);
}

export const researchReferencesCollectedArgs = { workflowId: vWorkflowId, result: vResultValidator, context: v.object({ runId: v.id("projectAiRuns") }) };

/** Keeps the collected screens on the run, or fails the run with the reason. */
export async function researchReferencesCollectedHandler(
  ctx: MutationCtx,
  args: { result: RunResult; context: { runId: Id<"projectAiRuns"> } },
) {
  const run = await ctx.db.get(args.context.runId);
  if (!run || run.status !== "running") return; // replaced or cancelled meanwhile
  const groups = args.result.kind === "success" ? (JSON.parse(args.result.returnValue as string) as ReferenceGroup[]) : null;
  const reason = !groups
    ? `Stage couldn't collect the reference screens: ${args.result.kind === "failed" ? args.result.error : "the job was cancelled"}.`
    : groups.every((group) => group.screens.length === 0) ? "Refero and Details returned no screens for this project. Start Research again in a minute." : null;
  const timestamp = now();
  if (reason) {
    await ctx.db.patch(run._id, { status: "failed", errorMessage: reason, completedAt: timestamp, updatedAt: timestamp });
    return;
  }
  await ctx.db.insert("projectAiRunCheckpoints", {
    userId: run.userId,
    projectId: run.projectId,
    runId: run._id,
    kind: "research-references",
    contentJson: JSON.stringify(groups),
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}

/** The screens a Research run collected; the save builds the UI patterns from these, never from the AI. */
export async function researchReferenceGroups(ctx: QueryCtx | MutationCtx, runId: Id<"projectAiRuns">): Promise<ReferenceGroup[]> {
  const checkpoint = await ctx.db.query("projectAiRunCheckpoints").withIndex("by_run_kind_screen", (q) => q.eq("runId", runId).eq("kind", "research-references")).first();
  if (!checkpoint) throw new Error("Stage is still collecting the screens for this run (or it failed). Check get_run_status until it says ready.");
  return JSON.parse(checkpoint.contentJson) as ReferenceGroup[];
}
