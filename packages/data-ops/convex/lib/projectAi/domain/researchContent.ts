import { resolveAssetUrl } from "../../../r2";
import { isStoredAssetKey } from "./r2Keys";

async function resolveStoredAssetUrls(value: unknown): Promise<unknown> {
  if (Array.isArray(value)) {
    return Promise.all(value.map((item) => resolveStoredAssetUrls(item)));
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const next: Record<string, unknown> = {};

    for (const [key, nested] of Object.entries(record)) {
      const isResolvableUrlField =
        (key === "imageUrl" ||
          key === "thumbnailUrl" ||
          key === "url" ||
          // Wireframes: rendered fragments and the run stylesheet live in R2.
          key === "htmlUrl" ||
          key === "liveUrl" ||
          key === "cssUrl") &&
        typeof nested === "string";

      if (isResolvableUrlField) {
        const assetKeyField =
          key === "imageUrl"
            ? "imageAssetKey"
            : key === "thumbnailUrl"
              ? "thumbnailAssetKey"
              : null;
        const explicitAssetKey =
          assetKeyField && typeof record[assetKeyField] === "string"
            ? record[assetKeyField]
            : null;
        const assetKey =
          explicitAssetKey && isStoredAssetKey(explicitAssetKey)
            ? explicitAssetKey
            : isStoredAssetKey(nested)
              ? nested
              : null;

        if (assetKey) {
          if (assetKeyField && typeof record[assetKeyField] !== "string") {
            next[assetKeyField] = assetKey;
          }
          next[key] = (await resolveAssetUrl(assetKey)) ?? nested;
        } else {
          next[key] = nested;
        }
        continue;
      }

      next[key] = await resolveStoredAssetUrls(nested);
    }

    return next;
  }

  return value;
}

export async function resolveResearchContentJson(contentJson: string | null | undefined) {
  return resolveAssetContentJson(contentJson);
}

export async function resolveAssetContentJson(contentJson: string | null | undefined) {
  if (!contentJson?.trim()) {
    return contentJson ?? null;
  }

  try {
    const parsed = JSON.parse(contentJson);
    const resolved = await resolveStoredAssetUrls(parsed);
    return JSON.stringify(resolved);
  } catch {
    return contentJson;
  }
}
