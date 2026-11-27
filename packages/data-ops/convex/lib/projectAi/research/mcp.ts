import { v } from "convex/values";
import { internal } from "../../../_generated/api";
import type { Id } from "../../../_generated/dataModel";
import type { ActionCtx, MutationCtx, QueryCtx } from "../../../_generated/server";
import { requireProjectAccess, requireProjectAccessForUserId } from "../../../_helpers";
import { detailsSectionSchema } from "../../../../src/contracts/research";
import { appScreenLibrary, referenceSearches, screenLibraryChoices, takeUniqueScreens, type ReferenceGroup, type ReferenceScreen, type ReferenceSearch } from "../../../../src/domain/researchReferences";
import { CREDIT_COSTS, requireCredits } from "../../credits/service";
import { resolveProjectCategory } from "../../projects/domain/projectCategory";
import { connectedDesignLibraries } from "../../integrations/contentPlatforms/domain";
import { type LibrarySearch, searchDesignLibrary } from "../../references/designLibraries";
import { downloadImage } from "../../references/imageUrl";
import { LibraryUnavailableError } from "../../references/mcpTools";
import { sharedReferoAvailable } from "../../references/sharedRefero";
import { storeProjectImage } from "../domain/storeImage";
import { upsertContextRecord } from "../domain/contextStore";
import { getContextRecord } from "../domain/records";
import { createRunRecord, findRunningRunForProjectModule } from "../domain/runStore";
import { now } from "../domain/time";
import { jobs } from "../../../workflows/jobs";
import { vWorkflowId, type WorkflowCtx } from "@convex-dev/workflow";
import { vResultValidator, type RunResult } from "@convex-dev/workpool";

// Research for AI tools (MCP), done the way Stage for Mac does it: the project's Research form
// (`projectAiContexts`, shared with the Mac form), then Stage collects the UI pattern screens itself
// in the user's own Mobbin, Refero or Details account (Refero: Stage's shared key during the grace period),
// keeps its own copy of each picture on the run; the AI writes the analysis.

type Access = { userId: Id<"users">; projectId: Id<"projects"> };
const access = { userId: v.id("users"), projectId: v.id("projects") };

export const researchInputsForApiArgs = access;

/** What Research can search for this user: their connected libraries plus the shared Refero access. */
async function researchLibraries(ctx: QueryCtx | MutationCtx, userId: Id<"users">) {
  return { ...(await connectedDesignLibraries(ctx, userId)), sharedRefero: await sharedReferoAvailable(ctx, userId) };
}

/** The Research form as the Mac shows it; screenTypes are its "Screens to analyze". */
export async function researchInputsForApiHandler(ctx: QueryCtx, args: Access) {
  const { project } = await requireProjectAccessForUserId(ctx, args);
  const context = await getContextRecord(ctx, args.projectId);
  const libraries = await researchLibraries(ctx, args.userId);
  return {
    projectType: resolveProjectCategory(project.type),
    industry: context?.industry ?? null,
    website: context?.clientWebsite ?? null,
    brief: context?.brief ?? null,
    competitorUrls: context?.competitorUrls ?? [],
    screenTypes: context?.detailsSections ?? [],
    // Only when both Mobbin and Refero are connected; otherwise Research uses the one there is.
    screenLibraryChoices: screenLibraryChoices(libraries),
    screenLibrary: appScreenLibrary(libraries, context?.screenLibrary),
  };
}

export const screenLibraryArgs = { projectId: v.id("projects") };

/** Which of the signed-in user's libraries Research and the moodboard use for this project (Stage for Mac asks). */
export async function screenLibraryHandler(ctx: QueryCtx, args: { projectId: Id<"projects"> }) {
  const { user, project } = await requireProjectAccess(ctx, args.projectId);
  const libraries = await researchLibraries(ctx, user._id);
  const context = await getContextRecord(ctx, args.projectId);
  return {
    screens: appScreenLibrary(libraries, context?.screenLibrary),
    choices: screenLibraryChoices(libraries),
    websiteSections: resolveProjectCategory(project.type) === "websites" ? (libraries.details ? "details" : libraries.mobbin ? "mobbin" : null) : null,
  };
}

export const saveResearchInputsForApiArgs = {
  ...access,
  industry: v.string(),
  website: v.optional(v.string()),
  brief: v.string(),
  competitorUrls: v.array(v.string()),
  screenTypes: v.array(v.string()),
  screenLibrary: v.optional(v.union(v.literal("mobbin"), v.literal("refero"))),
};

export async function saveResearchInputsForApiHandler(
  ctx: MutationCtx,
  args: Access & { industry: string; website?: string; brief: string; competitorUrls: string[]; screenTypes: string[]; screenLibrary?: "mobbin" | "refero" },
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
    screenLibrary: args.screenLibrary,
  });
}

const searchValidator = v.object({
  id: v.string(),
  title: v.string(),
  source: v.union(v.literal("mobbin-screens"), v.literal("refero-screens"), v.literal("mobbin-sections"), v.literal("details")),
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
  }, await researchLibraries(ctx, args.userId), context.screenLibrary);
  await jobs.start(ctx, internal.workflows.research.collect, { runId, userId: args.userId, projectId: args.projectId, searches }, {
    onComplete: internal.workflows.research.collected,
    context: { runId },
  });
  if (searches.length > 0) return { runId: String(runId), status: "running" as const };
  return {
    runId: String(runId),
    status: "running" as const,
    note: resolveProjectCategory(project.type) === "websites"
      ? "No Details or Mobbin account is connected, so this Research has no UI pattern references. Connect Details in Stage → Integrations for website UI patterns."
      : "No Mobbin or Refero account is connected, so this Research has no UI pattern references. Connect Mobbin or Refero in Stage → Integrations for UI patterns.",
  };
}

export const searchReferenceGroupForApiArgs = { userId: v.id("users"), search: searchValidator };

function librarySearch(search: ReferenceSearch): LibrarySearch {
  switch (search.source) {
    case "details":
      return { library: "details", query: search.query };
    case "mobbin-sections":
      return { library: "mobbin", kind: "sections", query: search.query };
    case "mobbin-screens":
      return { library: "mobbin", kind: "screens", query: search.query, platform: search.platform };
    case "refero-screens":
      return { library: "refero", query: search.query, platform: search.platform };
  }
}

const PROVIDER: Record<ReferenceSearch["source"], ReferenceGroup["provider"]> = {
  "mobbin-screens": "mobbin",
  "mobbin-sections": "mobbin",
  "refero-screens": "refero",
  details: "details",
};

/**
 * One step of the job: the screens for one screen type, from the user's Mobbin, Refero or Details account.
 * null when that library can't be used right now (signed out, out of credits): Research then runs without its patterns.
 */
export async function searchReferenceGroupForApiHandler(ctx: ActionCtx, { userId, search }: { userId: Id<"users">; search: ReferenceSearch }): Promise<ReferenceScreen[] | null> {
  try {
    const found = await searchDesignLibrary(ctx, userId, librarySearch(search));
    return found.map(({ id, title, productName, sourceUrl, thumbnailUrl }) => ({ id, title, productName, sourceUrl, thumbnailUrl }));
  } catch (error) {
    if (error instanceof LibraryUnavailableError) return null;
    throw error;
  }
}

export const storeGroupScreensArgs = {
  userId: v.id("users"),
  projectId: v.id("projects"),
  screens: v.array(v.object({ id: v.string(), title: v.string(), productName: v.optional(v.string()), sourceUrl: v.optional(v.string()), thumbnailUrl: v.optional(v.string()) })),
};

/** Stage's own copy of each kept screen's picture (Mobbin's links expire after 30 days); a screen whose picture can't be copied is left out. */
export async function storeGroupScreensHandler(
  ctx: ActionCtx,
  args: { userId: Id<"users">; projectId: Id<"projects">; screens: ReferenceScreen[] },
): Promise<ReferenceScreen[]> {
  const stored = await Promise.all(args.screens.map(async (screen) => {
    if (!screen.thumbnailUrl) return null;
    try {
      const image = await downloadImage(screen.thumbnailUrl);
      const { url } = await storeProjectImage(ctx, { userId: args.userId, projectId: args.projectId, purpose: "research-refero", name: screen.id, bytes: image.bytes, mimeType: image.mimeType });
      return { ...screen, thumbnailUrl: url ?? screen.thumbnailUrl };
    } catch {
      return null;
    }
  }));
  return stored.filter((screen): screen is NonNullable<typeof screen> => screen !== null);
}

export const collectResearchReferencesArgs = { runId: v.id("projectAiRuns"), userId: v.id("users"), projectId: v.id("projects"), searches: v.array(searchValidator) };

/** The job: every screen type searched in parallel (within the job pool's limit), each search retried on errors; screen types the library refused are left out. */
export async function collectResearchReferencesHandler(
  step: WorkflowCtx,
  args: { runId: Id<"projectAiRuns">; userId: Id<"users">; projectId: Id<"projects">; searches: ReferenceSearch[] },
): Promise<string> {
  const found = await Promise.all(args.searches.map((search) => step.runAction(internal.workflows.research.searchGroup, { userId: args.userId, search })));
  const searched = args.searches.flatMap((search, index) => {
    const screens = found[index];
    return screens ? [{ search, screens }] : [];
  });
  const unique = takeUniqueScreens(searched.map(({ screens }) => screens));
  const stored = await Promise.all(unique.map((screens) =>
    step.runAction(internal.workflows.research.storeGroupScreens, { userId: args.userId, projectId: args.projectId, screens })));
  const groups: ReferenceGroup[] = searched.map(({ search }, index) => ({
    id: search.id,
    title: search.title,
    provider: PROVIDER[search.source],
    screens: stored[index] ?? [],
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
    : groups.length > 0 && groups.every((group) => group.screens.length === 0) ? "The screen library returned no screens for this project. Start Research again in a minute." : null;
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
