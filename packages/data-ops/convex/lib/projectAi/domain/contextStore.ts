import type { Id } from "../../../_generated/dataModel";
import type { MutationCtx } from "../../../_generated/server";
import { attachTrackedR2Asset, deleteOldR2Asset } from "../../../r2";
import { getContextRecord } from "./records";
import { normalizeList, normalizeOptional } from "./normalize";
import { now } from "./time";

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
    referenceUrls: string[];
    brief?: string;
    briefAttachmentName?: string | null;
    briefAttachmentR2ObjectKey?: string | null;
    notes?: string;
  },
) {
  const existing = await getContextRecord(ctx, args.projectId);
  const timestamp = now();
  const hasBriefAttachmentKey = args.briefAttachmentR2ObjectKey !== undefined;
  const hasBriefAttachmentName = args.briefAttachmentName !== undefined;
  const nextBriefAttachmentKey = hasBriefAttachmentKey
    ? normalizeOptional(args.briefAttachmentR2ObjectKey)
    : existing?.briefAttachmentR2ObjectKey;
  const payload = {
    industry: normalizeOptional(args.industry),
    clientWebsite: normalizeOptional(args.clientWebsite),
    competitorUrls: normalizeList(args.competitorUrls),
    referenceUrls: normalizeList(args.referenceUrls),
    brief: normalizeOptional(args.brief),
    briefAttachmentName: hasBriefAttachmentName
      ? normalizeOptional(args.briefAttachmentName ?? undefined)
      : existing?.briefAttachmentName,
    briefAttachmentR2ObjectKey: nextBriefAttachmentKey,
    notes: normalizeOptional(args.notes),
    updatedAt: timestamp,
  };

  if (
    hasBriefAttachmentKey &&
    existing?.briefAttachmentR2ObjectKey &&
    existing.briefAttachmentR2ObjectKey !== nextBriefAttachmentKey
  ) {
    await deleteOldR2Asset(ctx, existing.briefAttachmentR2ObjectKey);
  }

  if (nextBriefAttachmentKey && existing?.briefAttachmentR2ObjectKey !== nextBriefAttachmentKey) {
    await attachTrackedR2Asset(ctx, { key: nextBriefAttachmentKey });
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
