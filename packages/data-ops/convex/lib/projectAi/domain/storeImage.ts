import { internal } from "../../../_generated/api";
import type { Id } from "../../../_generated/dataModel";
import type { ActionCtx } from "../../../_generated/server";
import { buildPublicAssetUrl } from "../../../helpers/r2/keys";
import { r2 } from "../../r2/domain";

const EXTENSION: Record<string, string> = { "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif", "image/png": "png" };

export function sanitizeId(value: string) {
  return value.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

/** Stores image bytes as a tracked R2 upload for the project (same purposes and keys as the Mac engine). */
export async function storeProjectImage(ctx: ActionCtx, args: { userId: Id<"users">; projectId: Id<"projects">; purpose: "research-refero" | "moodboard-refero" | "moodboard-url" | "moodboard-figma"; name: string; bytes: Uint8Array<ArrayBuffer>; mimeType: string }) {
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
  // Stage shows its own copy, so the picture never breaks when the source link expires (Mobbin, Figma).
  return { key, url: buildPublicAssetUrl(key) };
}

