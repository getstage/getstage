import { R2 } from "@convex-dev/r2";
import type { DataModel } from "../../_generated/dataModel";
import { components } from "../../_generated/api";
import type { MutationCtx, QueryCtx } from "../../_generated/server";
import type { UploadPurpose } from "../../../src/shared/uploadRules";
import { getUploadValidationError } from "../../../src/shared/uploadRules";
import { getExtensionFromMimeType, isR2Key, keyBelongsToUser } from "../../helpers/r2/keys";
import { collectR2KeysFromJson } from "../projectAi/domain/r2Keys";
import { now } from "../../helpers/time";

export const r2 = new R2(components.r2);

function buildObjectKey(
  userId: string,
  purpose: UploadPurpose,
  fileName: string,
  mimeType: string,
  scopeId?: string,
) {
  const extension = getExtensionFromMimeType(mimeType, fileName);
  const uuid = crypto.randomUUID();
  const scope = scopeId?.trim();

  function projectScopedKey(domain: string, source: string) {
    return scope
      ? `${domain}/projects/${scope}/users/${userId}/${source}/${uuid}.${extension}`
      : `${domain}/project-drafts/users/${userId}/${source}/${uuid}.${extension}`;
  }

  function userScopedKey(domain: string, source: string) {
    return `${domain}/users/${userId}/${source}/${uuid}.${extension}`;
  }

  switch (purpose) {
    case "task-attachment":
      return scope
        ? `tasks/projects/${scope}/users/${userId}/attachments/${uuid}.${extension}`
        : userScopedKey("tasks", "attachments");
    case "csv-upload":
      return userScopedKey("imports", "csv");
    case "profile-avatar":
      return userScopedKey("profiles", "avatars");
    case "client-avatar":
      return scope
        ? `clients/projects/${scope}/users/${userId}/avatars/${uuid}.${extension}`
        : userScopedKey("clients", "avatars");
    case "project-marker":
      return scope
        ? `projects/${scope}/users/${userId}/markers/${uuid}.${extension}`
        : `projects/project-drafts/users/${userId}/markers/${uuid}.${extension}`;
    case "portal-logo":
      return userScopedKey("portal", "logos");
    case "generated-design":
      return projectScopedKey("generated-designs", "images");
    case "project-asset":
      return projectScopedKey("project-assets", "files");
    case "research-refero":
      return projectScopedKey("research", "refero");
    case "research-brief":
      return projectScopedKey("research", "briefs");
    case "moodboard-upload":
      return projectScopedKey("moodboard", "uploads");
    case "moodboard-refero":
      return projectScopedKey("moodboard", "refero");
    case "moodboard-figma":
      return projectScopedKey("moodboard", "figma");
    case "moodboard-url":
      return projectScopedKey("moodboard", "urls");
    case "wireframe-brand-kit":
      return projectScopedKey("wireframes", "brand-kit");
  }
}

function getUploadUrlString(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  if (value && typeof value === "object") {
    const candidate =
      (value as { url?: unknown }).url ?? (value as { uploadUrl?: unknown }).uploadUrl;
    if (typeof candidate === "string") {
      return candidate;
    }
  }

  throw new Error("Could not generate an upload URL.");
}

export function hasLegacyUploadFields(upload: {
  status?: string;
  source?: string;
  entityType?: string;
  entityId?: string;
  attachedAt?: number;
  updatedAt?: number;
}) {
  return (
    upload.status !== undefined ||
    upload.source !== undefined ||
    upload.entityType !== undefined ||
    upload.entityId !== undefined ||
    upload.attachedAt !== undefined ||
    upload.updatedAt !== undefined
  );
}

async function deleteTrackedUploadRecord(ctx: MutationCtx, key: string) {
  const trackedAssets = await ctx.db
    .query("uploadedAssets")
    .withIndex("by_key", (q) => q.eq("key", key))
    .collect();

  await Promise.all(trackedAssets.map((asset) => ctx.db.delete(asset._id)));
}

export async function collectReferencedKeysForUser(ctx: QueryCtx, userId: string) {
  const referencedKeys = new Set<string>();
  const userRecord = await ctx.db.normalizeId("users", userId);

  if (userRecord) {
    const user = await ctx.db.get(userRecord);
    if (user?.avatarUrl && isR2Key(user.avatarUrl)) {
      referencedKeys.add(user.avatarUrl);
    }
    if (user?.defaultPortalLogoUrl && isR2Key(user.defaultPortalLogoUrl)) {
      referencedKeys.add(user.defaultPortalLogoUrl);
    }
  }

  const projects =
    userRecord
      ? await ctx.db
          .query("projects")
          .withIndex("by_user", (q) => q.eq("userId", userRecord))
          .collect()
      : [];

  for (const project of projects) {
    const maybeKeys = [
      project.clientAvatarUrl,
      project.projectImageUrl,
      project.startMarkerImageUrl,
      project.endMarkerImageUrl,
    ];

    for (const key of maybeKeys) {
      if (key && isR2Key(key)) {
        referencedKeys.add(key);
      }
    }
  }

  const clients =
    userRecord
      ? await ctx.db
          .query("clients")
          .withIndex("by_user", (q) => q.eq("userId", userRecord))
          .collect()
      : [];

  for (const client of clients) {
    if (client.avatarUrl && isR2Key(client.avatarUrl)) {
      referencedKeys.add(client.avatarUrl);
    }
  }

  const sheetConnections =
    userRecord
      ? await ctx.db
          .query("sheetConnections")
          .withIndex("by_user", (q) => q.eq("userId", userRecord))
          .collect()
      : [];

  for (const connection of sheetConnections) {
    if (connection.r2ObjectKey && isR2Key(connection.r2ObjectKey)) {
      referencedKeys.add(connection.r2ObjectKey);
    }
  }

  const attachments = await ctx.db.query("attachments").collect();
  for (const attachment of attachments) {
    if (attachment.r2ObjectKey && keyBelongsToUser(attachment.r2ObjectKey, userId)) {
      referencedKeys.add(attachment.r2ObjectKey);
    }
  }

  const generatedDesigns = await ctx.db.query("projectGeneratedDesigns").collect();
  for (const generatedDesign of generatedDesigns) {
    if (keyBelongsToUser(generatedDesign.r2ObjectKey, userId)) {
      referencedKeys.add(generatedDesign.r2ObjectKey);
    }
  }

  const portalConfigs = await ctx.db.query("portalConfigs").collect();
  for (const config of portalConfigs) {
    if (config.logoUrl && keyBelongsToUser(config.logoUrl, userId)) {
      referencedKeys.add(config.logoUrl);
    }
  }

  // Moodboard/research (and other AI modules) store durable asset keys inside artifact JSON.
  // Without this, prune treats those uploads as abandoned and deletes live images after 24h.
  if (userRecord) {
    for (const project of projects) {
      const artifacts = await ctx.db
        .query("projectAiArtifacts")
        .withIndex("by_project", (q) => q.eq("projectId", project._id))
        .collect();

      for (const artifact of artifacts) {
        if (!artifact.contentJson) {
          continue;
        }
        try {
          collectR2KeysFromJson(JSON.parse(artifact.contentJson), referencedKeys);
        } catch {
          // Ignore invalid JSON; reference collection is best-effort protection.
        }
      }
    }
  }

  return referencedKeys;
}

export async function deleteOldR2Asset(ctx: MutationCtx, oldValue: string | null | undefined) {
  if (!oldValue || !isR2Key(oldValue)) {
    return;
  }
  try {
    await r2.deleteObject(ctx, oldValue);
  } catch {
    // Best-effort: the old object may already be gone.
  }

  await deleteTrackedUploadRecord(ctx, oldValue);
}

export async function attachTrackedR2Asset(
  ctx: MutationCtx,
  args: {
    key: string | null | undefined;
  },
) {
  if (!args.key || !isR2Key(args.key)) {
    return;
  }
  await deleteTrackedUploadRecord(ctx, args.key);
}

export async function createTrackedUpload(
  ctx: MutationCtx,
  args: {
    userId: DataModel["users"]["document"]["_id"];
    purpose: UploadPurpose;
    fileName: string;
    fileSize: number;
    mimeType: string;
    scopeId?: string;
  },
) {
  const validationError = getUploadValidationError(args.purpose, {
    fileName: args.fileName,
    fileSize: args.fileSize,
    mimeType: args.mimeType,
  });

  if (validationError) {
    throw new Error(validationError);
  }

  const key = buildObjectKey(
    String(args.userId),
    args.purpose,
    args.fileName,
    args.mimeType,
    args.scopeId,
  );

  await ctx.db.insert("uploadedAssets", {
    userId: args.userId,
    key,
    purpose: args.purpose,
    fileName: args.fileName,
    fileSize: args.fileSize,
    mimeType: args.mimeType,
    createdAt: now(),
  });

  return {
    key,
    uploadUrl: getUploadUrlString(await r2.generateUploadUrl(key)),
  };
}
