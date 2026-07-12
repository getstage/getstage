import { getR2PublicBaseUrl } from "../../../helpers/r2/keys";

export function isR2ObjectKey(value: string) {
  return !/^https?:\/\//i.test(value) && !value.startsWith("data:");
}

function isKnownDomainFirstKey(value: string) {
  return (
    value.startsWith("clients/") ||
    value.startsWith("generated-designs/") ||
    value.startsWith("imports/") ||
    value.startsWith("portal/") ||
    value.startsWith("profiles/") ||
    value.startsWith("project-assets/") ||
    value.startsWith("projects/") ||
    value.startsWith("research/") ||
    value.startsWith("moodboard/") ||
    value.startsWith("tasks/") ||
    value.startsWith("wireframes/")
  );
}

function looksLikeTrackedObjectKey(value: string) {
  return (
    isKnownDomainFirstKey(value) ||
    value.startsWith("users/") ||
    value.includes("/research/") ||
    value.includes("/moodboard/")
  );
}

/** Strip our public CDN base from a URL so older artifacts that stored public URLs still resolve to keys. */
export function keyFromPublicAssetUrl(value: string) {
  const base = getR2PublicBaseUrl();
  if (!base) {
    return null;
  }

  const normalized = value.trim();
  const prefix = `${base}/`;
  if (!normalized.startsWith(prefix)) {
    return null;
  }

  const key = normalized.slice(prefix.length).split("?")[0]?.replace(/^\/+/, "");
  if (!key || !looksLikeTrackedObjectKey(key)) {
    return null;
  }

  return key;
}

export function collectR2KeysFromJson(value: unknown, keys: Set<string>) {
  if (typeof value === "string") {
    if (isR2ObjectKey(value) && looksLikeTrackedObjectKey(value)) {
      keys.add(value);
      return;
    }

    const fromPublicUrl = keyFromPublicAssetUrl(value);
    if (fromPublicUrl) {
      keys.add(fromPublicUrl);
    }
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectR2KeysFromJson(item, keys);
    }
    return;
  }

  if (value && typeof value === "object") {
    for (const nested of Object.values(value)) {
      collectR2KeysFromJson(nested, keys);
    }
  }
}

export function isStoredAssetKey(value: string) {
  return (
    !/^https?:\/\//i.test(value) &&
    !value.startsWith("data:") &&
    value.includes("/")
  );
}
