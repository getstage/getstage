import { v } from "convex/values";
import type { Id } from "../../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../../_generated/server";
import { requireProjectAccess, requireProjectAccessOrNull } from "../../../_helpers";
import { upsertContextRecord } from "../domain/contextStore";
import { getContextRecord } from "../domain/records";
import { now } from "../domain/time";
import { resolveAssetUrl } from "../../../r2";

export const getContextArgs = {
  projectId: v.id("projects"),
};

export async function getContextHandler(
  ctx: QueryCtx,
  args: { projectId: Id<"projects"> },
) {
  const access = await requireProjectAccessOrNull(ctx, args.projectId);
  if (!access) {
    return null;
  }

  const { user, project } = access;
  const record = await getContextRecord(ctx, args.projectId);

  return {
    projectId: String(project._id),
    userId: String(user._id),
    clientWebsite: record?.clientWebsite ?? "",
    industry: record?.industry ?? "",
    competitorUrls: record?.competitorUrls ?? [],
    referenceUrls: record?.referenceUrls ?? [],
    brief: record?.brief ?? "",
    briefAttachmentName: record?.briefAttachmentName ?? null,
    briefAttachmentR2ObjectKey: record?.briefAttachmentR2ObjectKey ?? null,
    briefAttachmentUrl: await resolveAssetUrl(record?.briefAttachmentR2ObjectKey ?? null),
    notes: record?.notes ?? "",
    lastProviderId: record?.lastProviderId ?? null,
    updatedAt: record?.updatedAt ?? null,
  };
}

export const getResearchInputArgs = {
  projectId: v.id("projects"),
};

export async function getResearchInputHandler(
  ctx: QueryCtx,
  args: { projectId: Id<"projects"> },
) {
  const { project } = await requireProjectAccess(ctx, args.projectId);
  const record = await getContextRecord(ctx, args.projectId);

  return {
    projectId: String(project._id),
    projectName: project.name,
    clientName: project.clientName,
    industry: record?.industry ?? null,
    website: record?.clientWebsite ?? null,
    projectBrief: record?.brief ?? null,
    competitorUrls: record?.competitorUrls ?? [],
    targetUsers: null,
    additionalNotes: record?.notes ?? null,
    uploadedAssetIds: record?.briefAttachmentR2ObjectKey
      ? [record.briefAttachmentR2ObjectKey]
      : [],
  };
}

export const upsertContextArgs = {
  projectId: v.id("projects"),
  industry: v.optional(v.string()),
  clientWebsite: v.optional(v.string()),
  competitorUrls: v.array(v.string()),
  referenceUrls: v.array(v.string()),
  brief: v.optional(v.string()),
  briefAttachmentName: v.optional(v.union(v.string(), v.null())),
  briefAttachmentR2ObjectKey: v.optional(v.union(v.string(), v.null())),
  notes: v.optional(v.string()),
};

export async function upsertContextHandler(
  ctx: MutationCtx,
  args: {
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
  const { user } = await requireProjectAccess(ctx, args.projectId);
  await upsertContextRecord(ctx, {
    userId: user._id,
    projectId: args.projectId,
    industry: args.industry,
    clientWebsite: args.clientWebsite,
    competitorUrls: args.competitorUrls,
    referenceUrls: args.referenceUrls,
    brief: args.brief,
    briefAttachmentName: args.briefAttachmentName,
    briefAttachmentR2ObjectKey: args.briefAttachmentR2ObjectKey,
    notes: args.notes,
  });

  return { saved: true, updatedAt: now() };
}
