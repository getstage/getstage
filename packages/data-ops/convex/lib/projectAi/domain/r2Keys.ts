export function isR2ObjectKey(value: string) {
  return !/^https?:\/\//i.test(value) && !value.startsWith("data:");
}

export function collectR2KeysFromJson(value: unknown, keys: Set<string>) {
  if (typeof value === "string") {
    const isKnownDomainFirstKey =
      value.startsWith("clients/") ||
      value.startsWith("generated-designs/") ||
      value.startsWith("imports/") ||
      value.startsWith("portal/") ||
      value.startsWith("profiles/") ||
      value.startsWith("project-assets/") ||
      value.startsWith("projects/") ||
      value.startsWith("research/") ||
      value.startsWith("moodboard/") ||
      value.startsWith("tasks/");

    if (
      isR2ObjectKey(value) &&
      (isKnownDomainFirstKey ||
        value.startsWith("users/") ||
        value.includes("/research/") ||
        value.includes("/moodboard/"))
    ) {
      keys.add(value);
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
