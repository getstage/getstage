import { v } from "convex/values";
import { internal } from "../../../_generated/api";
import type { Id } from "../../../_generated/dataModel";
import type { ActionCtx, MutationCtx, QueryCtx } from "../../../_generated/server";
import { requireProjectAccessForUserId } from "../../../_helpers";
import { aiStyleGuideSchema, moodboardArtifactSchema, type MoodboardArtifact, type MoodboardReference } from "../../../../src/contracts/moodboard";
import { researchArtifactSchema } from "../../../../src/contracts/research";
import {
  appendMoodboardReferences,
  directionHasImages,
  directionIdFromName,
  emptyMoodboardArtifact,
  mergeStyleGuide,
  normalizeStyleGuide,
  repairFontFamily,
  researchReferenceIds,
} from "../../../../src/domain/moodboard";
import { CREDIT_COSTS, recordUsage, requireCredits } from "../../credits/service";
import { resolveProjectCategory } from "../../projects/domain/projectCategory";
import { r2 } from "../../r2/domain";
import { buildPublicAssetUrl } from "../../../helpers/r2/keys";
import { downloadImage } from "../../references/imageUrl";
import { searchDetailsInspirations } from "../../references/details";
import { importFigmaImages } from "../../references/figma";
import { fetchReferoScreenImage, imageMimeType, searchReferoScreens, type ReferoPlatform } from "../../references/refero";
import { connectedFigmaAccessToken } from "./handlers";
import { assertNoProblems, styleGuideProblems } from "../../../../src/domain/aiStepRules";
import { findLatestArtifact } from "../domain/latestArtifact";
import { completeRunRecord, createRunRecord } from "../domain/runStore";
import { jobs } from "../../../workflows/jobs";
import { now } from "../domain/time";
import { vWorkflowId, type WorkflowCtx } from "@convex-dev/workflow";
import { vResultValidator, type RunResult } from "@convex-dev/workpool";
import { saveMoodboardResult } from "./handlers";

// Moodboard and Style guide for AI tools (MCP), done on the backend the way Stage for Mac's engine does it:
// Refero search with Stage's key, each chosen image stored as Stage's own copy in R2, the same moodboard save,
// and the same credits as a Mac import.

type StagedReference = Omit<MoodboardReference, "order" | "directionId" | "isInMoodboard">;

const EXTENSION: Record<string, string> = { "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif", "image/png": "png" };

function sanitizeId(value: string) {
  return value.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function httpsUrl(value: string | undefined) {
  return value && /^https?:\/\//.test(value) ? value : undefined;
}

async function loadMoodboard(ctx: QueryCtx | MutationCtx, projectId: Id<"projects">, title: string): Promise<MoodboardArtifact> {
  const latest = await findLatestArtifact(ctx, projectId, "moodboard", "moodboardArtifact");
  return latest?.contentJson
    ? moodboardArtifactSchema.parse(JSON.parse(latest.contentJson))
    : emptyMoodboardArtifact(String(projectId), title, Date.now());
}

/** Stores image bytes as a tracked R2 upload for the project (same purposes and keys as the Mac engine). */
async function storeImage(ctx: ActionCtx, args: { userId: Id<"users">; projectId: Id<"projects">; purpose: "moodboard-refero" | "moodboard-url" | "moodboard-figma"; name: string; bytes: Uint8Array<ArrayBuffer>; mimeType: string }) {
  const { key, uploadUrl } = await ctx.runMutation(internal.r2.generateUploadUrlForApi, {
    userId: args.userId,
    purpose: args.purpose,
    fileName: `${sanitizeId(args.name) || "image"}.${EXTENSION[args.mimeType] ?? "png"}`,
    fileSize: args.bytes.length,
    mimeType: args.mimeType,
    scopeId: String(args.projectId),
  });
  const response = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": args.mimeType }, body: args.bytes });
  if (!response.ok) throw new Error("Could not store the image.");
  await r2.syncMetadata(ctx, key);
  // The moodboard shows Stage's own copy, so it never breaks when the source link expires (Figma renders do).
  return { key, url: buildPublicAssetUrl(key) };
}

export const searchReferencesForApiArgs = {
  query: v.string(),
  source: v.union(v.literal("refero"), v.literal("details")),
  platform: v.union(v.literal("web"), v.literal("ios"), v.literal("android")),
};

/** Refero screens (apps, moodboard) or Details website sections (website Research), as the Mac engine uses them. */
export async function searchReferencesForApiHandler(_ctx: ActionCtx, args: { query: string; source: "refero" | "details"; platform: ReferoPlatform }) {
  return args.source === "details" ? searchDetailsInspirations(args.query) : searchReferoScreens(args.query, args.platform);
}

const screenValidator = v.object({ id: v.string(), title: v.string(), sourceUrl: v.optional(v.string()), thumbnailUrl: v.optional(v.string()), imageUrl: v.optional(v.string()) });
type Screen = { id: string; title: string; sourceUrl?: string; thumbnailUrl?: string; imageUrl?: string };

// One thing to import; each becomes one step of the import job.
export const importItemValidator = v.union(
  v.object({ kind: v.literal("refero"), screen: screenValidator }),
  v.object({ kind: v.literal("url"), url: v.string() }),
  v.object({ kind: v.literal("figma"), url: v.string() }),
);
export type ImportItem = { kind: "refero"; screen: Screen } | { kind: "url"; url: string } | { kind: "figma"; url: string };

export const startMoodboardImportForApiArgs = {
  userId: v.id("users"),
  projectId: v.id("projects"),
  items: v.array(importItemValidator),
  direction: v.optional(v.string()),
};

/**
 * Checks everything that can fail before any download (access, Strategy, credits, Figma connected), opens the
 * import run and starts the import job. The AI tool follows the run with get_run_status.
 */
export async function startMoodboardImportForApiHandler(
  ctx: MutationCtx,
  args: { userId: Id<"users">; projectId: Id<"projects">; items: ImportItem[]; direction?: string },
) {
  const { project } = await requireProjectAccessForUserId(ctx, args);
  if (args.items.length === 0) throw new Error("Pick at least one Refero screen, image URL or Figma link.");
  // Same order as the Mac app: the moodboard follows the Strategy.
  if (!(await findLatestArtifact(ctx, args.projectId, "strategy", "strategyArtifact"))) {
    throw new Error("Save Strategy first: the Moodboard comes after Strategy.");
  }
  await requireCredits(ctx, project.userId, CREDIT_COSTS.moodboardFallback);
  if (args.items.some((item) => item.kind === "figma")) {
    const figma = await connectedFigmaAccessToken(ctx, args.userId);
    if (!figma) throw new Error("Connect Figma in Stage first (Integrations → Figma), then add the Figma link again.");
    // Stage doesn't refresh Figma tokens yet; an expired one would only come back as a 403 later.
    if (figma.accessTokenExpiresAt !== null && figma.accessTokenExpiresAt < Date.now()) {
      throw new Error("Your Figma connection in Stage has expired. Reconnect Figma (Integrations → Figma), then add the Figma link again.");
    }
  }
  const runId = await createRunRecord(ctx, {
    userId: args.userId,
    projectId: args.projectId,
    module: "moodboard",
    title: "Moodboard import (AI tool)",
    status: "running",
    trigger: "agent",
  });
  await jobs.start(ctx, internal.workflows.moodboardImport.run, { ...args, runId }, {
    onComplete: internal.workflows.moodboardImport.finished,
    context: { runId },
  });
  return { runId: String(runId), status: "running" as const };
}

export const importMoodboardItemForApiArgs = { userId: v.id("users"), projectId: v.id("projects"), item: importItemValidator };

/** Imports one item as Stage's own copy in R2. Never throws: a failed item is reported with its reason. */
export async function importMoodboardItemForApiHandler(
  ctx: ActionCtx,
  args: { userId: Id<"users">; projectId: Id<"projects">; item: ImportItem },
): Promise<{ references: StagedReference[]; failed?: string }> {
  const { item } = args;
  try {
    switch (item.kind) {
      case "refero": {
        const bytes = await fetchReferoScreenImage(item.screen.id);
        const { key, url } = await storeImage(ctx, { ...args, purpose: "moodboard-refero", name: item.screen.id, bytes, mimeType: imageMimeType(bytes) });
        const display = url ?? httpsUrl(item.screen.imageUrl) ?? httpsUrl(item.screen.thumbnailUrl) ?? key;
        return { references: [{ id: `refero-${item.screen.id}-${Date.now()}`, title: item.screen.title, imageUrl: display, imageAssetKey: key, thumbnailAssetKey: key, thumbnailUrl: display, source: "url", sourceUrl: httpsUrl(item.screen.sourceUrl) }] };
      }
      case "url": {
        const image = await downloadImage(item.url);
        const { key, url } = await storeImage(ctx, { ...args, purpose: "moodboard-url", name: image.title, bytes: image.bytes, mimeType: image.mimeType });
        return { references: [{ id: `url-${sanitizeId(image.title)}-${Date.now()}`, title: image.title, imageUrl: url ?? image.url, imageAssetKey: key, thumbnailUrl: url ?? image.url, thumbnailAssetKey: key, source: "url", sourceUrl: image.url }] };
      }
      case "figma": {
        // The token is read here, never stored in the job's saved state.
        const token = await ctx.runQuery(internal.workflows.moodboardImport.figmaAccessToken, { userId: args.userId });
        if (!token) throw new Error("Figma is no longer connected in Stage.");
        const references: StagedReference[] = [];
        // Same as a Mac Figma import: each frame rendered as a PNG, stored as Stage's own copy, linked back to Figma.
        for (const image of await importFigmaImages(token, item.url)) {
          const { key, url } = await storeImage(ctx, { ...args, purpose: "moodboard-figma", name: image.id, bytes: image.bytes, mimeType: "image/png" });
          references.push({ id: `figma-${sanitizeId(image.id)}-${Date.now()}`, title: image.title, imageUrl: url ?? image.renderUrl, imageAssetKey: key, thumbnailAssetKey: key, thumbnailUrl: url ?? image.renderUrl, source: "figma", sourceUrl: image.sourceUrl });
        }
        return { references };
      }
    }
  } catch (error) {
    const label = item.kind === "refero" ? item.screen.title : item.url;
    const reason = error instanceof Error ? error.message : "could not import";
    // The job keeps going with the other items; this line makes the failure visible in the Convex logs.
    console.warn("Moodboard import item failed", { kind: item.kind, projectId: args.projectId, reason });
    return { references: [], failed: `${label} (${reason})` };
  }
}

export const importMoodboardReferencesArgs = {
  userId: v.id("users"),
  projectId: v.id("projects"),
  runId: v.id("projectAiRuns"),
  items: v.array(importItemValidator),
  direction: v.optional(v.string()),
};

/** The import job: one step per item (within the job pool's limit), then one step that adds them to the moodboard. */
export async function importMoodboardReferencesHandler(
  step: WorkflowCtx,
  args: { userId: Id<"users">; projectId: Id<"projects">; runId: Id<"projectAiRuns">; items: ImportItem[]; direction?: string },
): Promise<string> {
  // Each item reports its own failure, so a retry would only repeat a known error.
  const results = await Promise.all(args.items.map((item) =>
    step.runAction(internal.workflows.moodboardImport.importItem, { userId: args.userId, projectId: args.projectId, item }, { retry: false })));
  const references = results.flatMap((result) => result.references);
  const failed = results.flatMap((result) => (result.failed ? [result.failed] : []));
  if (references.length === 0) throw new Error(`No image could be imported: ${failed.join("; ")}`);
  const importMode = args.items.some((item) => item.kind === "figma") ? "figma" : args.items.some((item) => item.kind === "refero") ? "ai" : "url";
  await step.runMutation(internal.workflows.moodboardImport.addToMoodboard, {
    userId: args.userId,
    projectId: args.projectId,
    runId: args.runId,
    referencesJson: JSON.stringify(references),
    importMode,
    direction: args.direction,
  });
  return JSON.stringify({ imported: references.length, failed, directionId: args.direction ? directionIdFromName(args.direction) : null });
}

export const moodboardImportFinishedArgs = { workflowId: vWorkflowId, result: vResultValidator, context: v.object({ runId: v.id("projectAiRuns") }) };

/** Keeps the import's outcome on the run (imported, failed items), or fails the run with the reason. */
export async function moodboardImportFinishedHandler(ctx: MutationCtx, args: { result: RunResult; context: { runId: Id<"projectAiRuns"> } }) {
  const run = await ctx.db.get(args.context.runId);
  if (!run || run.status === "cancelled") return; // the user cancelled it meanwhile
  const timestamp = now();
  if (args.result.kind !== "success") {
    const reason = args.result.kind === "failed" ? args.result.error : "The import was cancelled.";
    await ctx.db.patch(run._id, { status: "failed", errorMessage: reason, completedAt: timestamp, updatedAt: timestamp });
    return;
  }
  await ctx.db.insert("projectAiRunCheckpoints", {
    userId: run.userId,
    projectId: run.projectId,
    runId: run._id,
    kind: "moodboard-import",
    contentJson: args.result.returnValue as string,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}

export const figmaAccessTokenForApiArgs = { userId: v.id("users") };

export async function figmaAccessTokenForApiHandler(ctx: QueryCtx, args: { userId: Id<"users"> }) {
  return (await connectedFigmaAccessToken(ctx, args.userId))?.accessToken ?? null;
}

export const appendMoodboardReferencesForApiArgs = {
  userId: v.id("users"),
  projectId: v.id("projects"),
  runId: v.id("projectAiRuns"),
  referencesJson: v.string(),
  importMode: v.union(v.literal("ai"), v.literal("url"), v.literal("figma")),
  direction: v.optional(v.string()),
};

/** Adds the stored images to the moodboard, completes the import run and charges it like a Mac moodboard import. */
export async function appendMoodboardReferencesForApiHandler(
  ctx: MutationCtx,
  args: { userId: Id<"users">; projectId: Id<"projects">; runId: Id<"projectAiRuns">; referencesJson: string; importMode: "ai" | "url" | "figma"; direction?: string },
) {
  const access = await requireProjectAccessForUserId(ctx, args);
  // Cancelled while the images were downloading: add nothing, charge nothing.
  if ((await ctx.db.get(args.runId))?.status !== "running") throw new Error("The import was cancelled.");
  const moodboard = appendMoodboardReferences(
    await loadMoodboard(ctx, args.projectId, "Project moodboard"),
    JSON.parse(args.referencesJson) as StagedReference[],
    { importMode: args.importMode, directionName: args.direction, generatedAt: Date.now() },
  );
  await saveMoodboardResult(ctx, access, { projectId: args.projectId, title: moodboard.title, contentJson: JSON.stringify(moodboardArtifactSchema.parse(moodboard)) });
  await completeRunRecord(ctx, args.runId);
  await recordUsage(ctx, { ownerUserId: access.project.userId, kind: "moodboard", credits: CREDIT_COSTS.moodboardFallback, userId: args.userId, runId: String(args.runId) });
}

export const saveStyleGuideForApiArgs = {
  userId: v.id("users"),
  projectId: v.id("projects"),
  direction: v.string(),
  styleGuideJson: v.string(),
};

/** Saves an AI-written style guide for one moodboard direction, grounded and merged as the Mac engine does. */
export async function saveStyleGuideForApiHandler(
  ctx: MutationCtx,
  args: { userId: Id<"users">; projectId: Id<"projects">; direction: string; styleGuideJson: string },
) {
  const access = await requireProjectAccessForUserId(ctx, args);
  const latest = await findLatestArtifact(ctx, args.projectId, "moodboard", "moodboardArtifact");
  if (!latest?.contentJson) throw new Error("Add images to the moodboard first (add_to_moodboard with a direction).");
  const moodboard = moodboardArtifactSchema.parse(JSON.parse(latest.contentJson));
  const directionId = directionIdFromName(args.direction);
  const direction = moodboard.directions.find((entry) => entry.id === directionId);
  if (!direction) throw new Error(`The moodboard has no direction "${args.direction}". Add images to it first.`);
  if (!directionHasImages(moodboard, directionId)) throw new Error(`Add at least one image to the "${direction.name}" direction before saving its style guide.`);

  const research = await findLatestArtifact(ctx, args.projectId, "research", "researchArtifact");
  const parsedResearch = research?.contentJson ? researchArtifactSchema.safeParse(JSON.parse(research.contentJson)) : null;
  const { spec, ...generated } = aiStyleGuideSchema.parse(JSON.parse(args.styleGuideJson));
  // Tagged references must be images of this direction, so the editor and DESIGN.md can show them.
  const directionImages = new Set(moodboard.references.filter((reference) => reference.directionId === directionId).map((reference) => reference.id));
  const unknownReferences = spec.references.flatMap((entry, index) =>
    directionImages.has(entry.referenceId) ? [] : [`spec.references[${index}].referenceId: "${entry.referenceId}" is not an image in "${direction.name}"`]);
  assertNoProblems("The style guide", [...styleGuideProblems(generated), ...unknownReferences]);
  const normalized = normalizeStyleGuide(generated, {
    id: moodboard.styleGuides.find((guide) => guide.directionId === directionId)?.id ?? crypto.randomUUID(),
    directionId,
    directionName: direction.name,
    category: resolveProjectCategory(access.project.type),
    researchReferenceIds: parsedResearch?.success ? researchReferenceIds(parsedResearch.data) : [],
  });
  // Stored where the Mac's Style Guide editor keeps its edits, so the editor, web and DESIGN.md all show it;
  // its fonts follow the same rule as the generated guide.
  const fonts = { ...spec.fonts, heading: repairFontFamily(spec.fonts.heading), body: repairFontFamily(spec.fonts.body) };
  const styleGuide = { ...normalized, spec: { ...spec, fonts } };
  await saveMoodboardResult(ctx, access, {
    projectId: args.projectId,
    title: moodboard.title,
    contentJson: JSON.stringify(mergeStyleGuide(moodboard, styleGuide)),
  });
  return { styleGuideId: styleGuide.id, directionId };
}
