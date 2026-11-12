import { findGoogleFont, googleFontCssUrl } from "@stage/data-ops/domain/googleFonts";

const requested = new Set<string>();

/** Adds the stylesheet for a Google Font once (browser only). Unknown families are ignored. */
export function ensureGoogleFont(family: string) {
  const font = findGoogleFont(family);
  if (!font || requested.has(family) || typeof document === "undefined") return;
  requested.add(family);
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = googleFontCssUrl(font);
  document.head.appendChild(link);
}
