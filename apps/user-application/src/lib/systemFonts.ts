// Brand fonts the engine prefers and the app ships with. Always offered in the
// font picker (they may not be installed as system fonts) and used as the
// fallback list on the web build or when the Local Font Access API is missing.
export const BUNDLED_FONTS = [
  "Geist",
  "Fraunces",
  "Space Grotesk",
  "Satoshi",
  "Geist Mono",
] as const;

type FontDataLike = { family?: string };
type QueryLocalFonts = () => Promise<FontDataLike[]>;

function getQueryLocalFonts(): QueryLocalFonts | undefined {
  if (typeof window === "undefined") return undefined;
  const candidate = (window as unknown as { queryLocalFonts?: unknown }).queryLocalFonts;
  return typeof candidate === "function" ? (candidate as QueryLocalFonts) : undefined;
}

/** True when the running build can enumerate installed system fonts. */
export function canListSystemFonts(): boolean {
  return getQueryLocalFonts() !== undefined;
}

export type LocalFontPermissionState = "unsupported" | "granted" | "prompt" | "denied" | "unknown";

/** Session flag: user chose bundled fonts only and should not be prompted again. */
export const SYSTEM_FONTS_SKIPPED_STORAGE_KEY = "stage:system-fonts-skipped";

/** Reads the browser local-fonts permission when the API is available. */
export async function getLocalFontPermissionState(): Promise<LocalFontPermissionState> {
  if (!getQueryLocalFonts()) return "unsupported";

  try {
    if (!("permissions" in navigator) || typeof navigator.permissions.query !== "function") {
      return "unknown";
    }

    const status = await navigator.permissions.query({
      name: "local-fonts" as PermissionName,
    });

    if (status.state === "granted") return "granted";
    if (status.state === "denied") return "denied";
    return "prompt";
  } catch {
    return "unknown";
  }
}

export function hasSkippedSystemFonts(): boolean {
  if (typeof sessionStorage === "undefined") return false;
  return sessionStorage.getItem(SYSTEM_FONTS_SKIPPED_STORAGE_KEY) === "1";
}

export function markSystemFontsSkipped(): void {
  sessionStorage.setItem(SYSTEM_FONTS_SKIPPED_STORAGE_KEY, "1");
}

/**
 * Lists installed font families via the Local Font Access API
 * (`window.queryLocalFonts`), available in the desktop (Electron) build where
 * the `local-fonts` permission is granted. Must be triggered from a user
 * gesture. Filters out private/system families (names starting with "."),
 * de-duplicates, and sorts. Returns BUNDLED_FONTS when the API is unavailable
 * or yields nothing (e.g. the web build).
 */
export async function listSystemFonts(): Promise<string[]> {
  const query = getQueryLocalFonts();
  if (!query) return [...BUNDLED_FONTS];
  try {
    const fonts = await query();
    const families = new Set<string>();
    for (const font of fonts) {
      const family = font.family?.trim();
      if (family && !family.startsWith(".")) families.add(family);
    }
    const list = [...families].sort((a, b) => a.localeCompare(b));
    return list.length > 0 ? list : [...BUNDLED_FONTS];
  } catch {
    return [...BUNDLED_FONTS];
  }
}
