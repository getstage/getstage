import type { Id } from "../../../_generated/dataModel";
import type { MutationCtx } from "../../../_generated/server";
import { attachTrackedR2Asset, deleteOldR2Asset } from "../../../r2";
import { getContextRecord } from "./records";
import { normalizeList, normalizeOptional } from "./normalize";
import { now } from "./time";
import type { DetailsSection } from "./validators";

type ProjectAiProviderId = "claude" | "codex";

export async function setLastProviderId(
  ctx: MutationCtx,
  args: {
    userId: Id<"users">;
    projectId: Id<"projects">;
    providerId: ProjectAiProviderId;
  },
) {
  const existing = await getContextRecord(ctx, args.projectId);
  const timestamp = now();

  if (existing) {
    await ctx.db.patch(existing._id, {
      lastProviderId: args.providerId,
      updatedAt: timestamp,
    });
    return existing._id;
  }

  return ctx.db.insert("projectAiContexts", {
    userId: args.userId,
    projectId: args.projectId,
    competitorUrls: [],
    referenceUrls: [],
    lastProviderId: args.providerId,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}

export async function upsertContextRecord(
  ctx: MutationCtx,
  args: {
    userId: Id<"users">;
    projectId: Id<"projects">;
    industry?: string;
    clientWebsite?: string;
    competitorUrls: string[];
    detailsSections?: DetailsSection[];
    referenceUrls: string[];
    brief?: string;
    briefAttachmentName?: string | null;
    briefAttachmentR2ObjectKey?: string | null;
    briefAttachments?: Array<{ name: string; r2ObjectKey: string }> | null;
    notes?: string;
  },
) {
  const existing = await getContextRecord(ctx, args.projectId);
  const timestamp = now();
  const hasBriefList = args.briefAttachments !== undefined;
  const nextBriefFiles = hasBriefList
    ? (args.briefAttachments ?? [])
        .map((file) => ({ name: file.name.trim(), r2ObjectKey: file.r2ObjectKey.trim() }))
        .filter((file) => file.name.length > 0 && file.r2ObjectKey.length > 0)
        .slice(0, 5)
    : null;
  const hasBriefAttachmentKey = hasBriefList || args.briefAttachmentR2ObjectKey !== undefined;
  const hasBriefAttachmentName = hasBriefList || args.briefAttachmentName !== undefined;
  const nextBriefAttachmentKey = hasBriefList
    ? nextBriefFiles?.[0]?.r2ObjectKey
    : args.briefAttachmentR2ObjectKey !== undefined
      ? normalizeOptional(args.briefAttachmentR2ObjectKey)
      : existing?.briefAttachmentR2ObjectKey;
  const nextBriefAttachmentName = hasBriefList
    ? nextBriefFiles?.[0]?.name
    : args.briefAttachmentName !== undefined
      ? normalizeOptional(args.briefAttachmentName ?? undefined)
      : existing?.briefAttachmentName;
  const payload = {
    industry: normalizeOptional(args.industry),
    clientWebsite: normalizeOptional(args.clientWebsite),
    competitorUrls: normalizeList(args.competitorUrls),
    detailsSections:
      args.detailsSections === undefined
        ? existing?.detailsSections
        : Array.from(new Set(args.detailsSections)),
    referenceUrls: normalizeList(args.referenceUrls),
    brief: normalizeOptional(args.brief),
    briefAttachmentName: hasBriefAttachmentName
      ? nextBriefAttachmentName
      : existing?.briefAttachmentName,
    briefAttachmentR2ObjectKey: nextBriefAttachmentKey,
    ...(hasBriefList ? { briefAttachments: nextBriefFiles ?? [] } : {}),
    notes: normalizeOptional(args.notes),
    updatedAt: timestamp,
  };

  const previousKeys = new Set<string>();
  if (existing?.briefAttachmentR2ObjectKey) previousKeys.add(existing.briefAttachmentR2ObjectKey);
  for (const file of existing?.briefAttachments ?? []) {
    if (file.r2ObjectKey) previousKeys.add(file.r2ObjectKey);
  }
  const nextKeys = new Set<string>();
  if (nextBriefAttachmentKey) nextKeys.add(nextBriefAttachmentKey);
  for (const file of nextBriefFiles ?? []) nextKeys.add(file.r2ObjectKey);

  if (hasBriefAttachmentKey) {
    for (const key of previousKeys) {
      if (!nextKeys.has(key)) await deleteOldR2Asset(ctx, key);
    }
  }

  for (const key of nextKeys) {
    if (!previousKeys.has(key)) await attachTrackedR2Asset(ctx, { key });
  }

  if (existing) {
    await ctx.db.patch(existing._id, payload);
    return existing._id;
  }

  return ctx.db.insert("projectAiContexts", {
    userId: args.userId,
    projectId: args.projectId,
    createdAt: timestamp,
    ...payload,
  });
}
