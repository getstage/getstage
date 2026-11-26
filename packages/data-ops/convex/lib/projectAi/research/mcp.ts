import { v } from "convex/values";
import { internal } from "../../../_generated/api";
import type { Id } from "../../../_generated/dataModel";
import type { ActionCtx, MutationCtx, QueryCtx } from "../../../_generated/server";
import { requireProjectAccessForUserId } from "../../../_helpers";
import { detailsSectionSchema } from "../../../../src/contracts/research";
import { referenceSearches, takeUniqueScreens, type ReferenceGroup, type ReferenceScreen, type ReferenceSearch } from "../../../../src/domain/researchReferences";
import { CREDIT_COSTS, requireCredits } from "../../credits/service";
import { resolveProjectCategory } from "../../projects/domain/projectCategory";
import { connectedDesignLibraries } from "../../integrations/contentPlatforms/domain";
import { searchDesignLibrary } from "../../references/designLibraries";
import { LibraryUnavailableError } from "../../references/mcpTools";
import { upsertContextRecord } from "../domain/contextStore";
import { getContextRecord } from "../domain/records";
import { createRunRecord, findRunningRunForProjectModule } from "../domain/runStore";
import { now } from "../domain/time";
import { jobs } from "../../../workflows/jobs";
import { vWorkflowId, type WorkflowCtx } from "@convex-dev/workflow";
import { vResultValidator, type RunResult } from "@convex-dev/workpool";

// Research for AI tools (MCP), done the way Stage for Mac does it: the project's Research form
// (`projectAiContexts`, shared with the Mac form), then Stage collects the UI pattern screens itself
// in the user's own Mobbin or Details account and keeps them on the run; the AI writes the analysis.

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
  source: v.union(v.literal("mobbin-screens"), v.literal("mobbin-sections"), v.literal("details")),
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
  }, await connectedDesignLibraries(ctx, args.userId));
  await jobs.start(ctx, internal.workflows.research.collect, { runId, userId: args.userId, searches }, {
    onComplete: internal.workflows.research.collected,
    context: { runId },
  });
  if (searches.length > 0) return { runId: String(runId), status: "running" as const };
  return {
    runId: String(runId),
    status: "running" as const,
    note: "No Mobbin or Details account is connected, so this Research has no UI pattern references. Connect Mobbin (or Details for websites) in Stage → Integrations for UI patterns.",
  };
}

export const searchReferenceGroupForApiArgs = { userId: v.id("users"), search: searchValidator };

/**
 * One step of the job: the screens for one screen type, from the user's Mobbin or Details account.
 * null when that library can't be used right now (signed out, out of credits): Research then runs without its patterns.
 */
export async function searchReferenceGroupForApiHandler(ctx: ActionCtx, { userId, search }: { userId: Id<"users">; search: ReferenceSearch }): Promise<ReferenceScreen[] | null> {
  try {
    const found = await searchDesignLibrary(ctx, userId, search.source === "details"
      ? { library: "details", query: search.query }
      : search.source === "mobbin-sections"
        ? { library: "mobbin", kind: "sections", query: search.query }
        : { library: "mobbin", kind: "screens", query: search.query, platform: search.platform });
    return found.map(({ id, title, productName, sourceUrl, thumbnailUrl }) => ({ id, title, productName, sourceUrl, thumbnailUrl }));
  } catch (error) {
    if (error instanceof LibraryUnavailableError) return null;
    throw error;
  }
}

export const collectResearchReferencesArgs = { runId: v.id("projectAiRuns"), userId: v.id("users"), searches: v.array(searchValidator) };

/** The job: every screen type searched in parallel (within the job pool's limit), each search retried on errors; screen types the library refused are left out. */
export async function collectResearchReferencesHandler(
  step: WorkflowCtx,
  args: { runId: Id<"projectAiRuns">; userId: Id<"users">; searches: ReferenceSearch[] },
): Promise<string> {
  const found = await Promise.all(args.searches.map((search) => step.runAction(internal.workflows.research.searchGroup, { userId: args.userId, search })));
  const searched = args.searches.flatMap((search, index) => {
    const screens = found[index];
    return screens ? [{ search, screens }] : [];
  });
  const unique = takeUniqueScreens(searched.map(({ screens }) => screens));
  const groups: ReferenceGroup[] = searched.map(({ search }, index) => ({
    id: search.id,
    title: search.title,
    provider: search.source === "details" ? "details" : "mobbin",
    screens: unique[index] ?? [],
  }));
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
    : groups.length > 0 && groups.every((group) => group.screens.length === 0) ? "Mobbin and Details returned no screens for this project. Start Research again in a minute." : null;
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
