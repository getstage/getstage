import { resolveAssetUrl } from "../../../r2";
import { isStoredAssetKey } from "./r2Keys";

async function resolveResearchImageUrls(value: unknown): Promise<unknown> {
  if (Array.isArray(value)) {
    return Promise.all(value.map((item) => resolveResearchImageUrls(item)));
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const next: Record<string, unknown> = {};

    for (const [key, nested] of Object.entries(record)) {
      const isResolvableUrlField =
        (key === "imageUrl" || key === "thumbnailUrl" || key === "url") &&
        typeof nested === "string";

      if (isResolvableUrlField) {
        next[key] =
          isStoredAssetKey(nested) ? ((await resolveAssetUrl(nested)) ?? nested) : nested;
        continue;
      }

      next[key] = await resolveResearchImageUrls(nested);
    }

    return next;
  }

  return value;
}

export async function resolveResearchContentJson(contentJson: string | null | undefined) {
  if (!contentJson?.trim()) {
    return contentJson ?? null;
  }

  try {
    const parsed = JSON.parse(contentJson);
    const resolved = await resolveResearchImageUrls(parsed);
    return JSON.stringify(resolved);
  } catch {
    return contentJson;
  }
}
