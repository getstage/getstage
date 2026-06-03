export function isR2ObjectKey(value: string) {
  return !/^https?:\/\//i.test(value) && !value.startsWith("data:");
}

export function collectR2KeysFromJson(value: unknown, keys: Set<string>) {
  if (typeof value === "string") {
    if (isR2ObjectKey(value) && value.includes("/research/")) {
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
