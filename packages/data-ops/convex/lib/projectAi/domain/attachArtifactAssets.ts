import type { MutationCtx } from "../../../_generated/server";
import { attachTrackedR2Asset } from "../../../r2";
import { collectR2KeysFromJson } from "./r2Keys";

/**
 * Mark R2 objects referenced by an artifact as permanently attached.
 *
 * Upload flow inserts rows into `uploadedAssets`. The hourly prune cron deletes
 * any object still listed there after 24h. Calling this removes those tracking
 * rows so live moodboard/research images are not garbage-collected.
 */
export async function attachTrackedR2AssetsFromContentJson(
  ctx: MutationCtx,
  contentJson: string | null | undefined,
) {
  if (!contentJson?.trim()) {
    return;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(contentJson);
  } catch {
    return;
  }

  const keys = new Set<string>();
  collectR2KeysFromJson(parsed, keys);

  for (const key of keys) {
    await attachTrackedR2Asset(ctx, { key });
  }
}
