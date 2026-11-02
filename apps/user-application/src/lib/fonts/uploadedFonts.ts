import type { StyleGuideSpec } from "@stage/data-ops/contracts";
import { ensureGoogleFont } from "./googleFonts";

export type UploadedFont = NonNullable<StyleGuideSpec["fonts"]["uploads"]>[number];

const registered = new Set<string>();

/** Registers an uploaded font file under its family name once. One file covers every weight. */
export function ensureUploadedFont(font: UploadedFont) {
  if (!font.url || typeof document === "undefined") return;
  const id = `${font.family}|${font.url}`;
  if (registered.has(id)) return;
  registered.add(id);
  const face = new FontFace(font.family, `url(${JSON.stringify(font.url)})`, { weight: "100 900" });
  document.fonts.add(face);
  face.load().catch(() => registered.delete(id));
}

/** Makes every font a Style Guide uses available on the page. */
export function ensureStyleGuideFonts(fonts: StyleGuideSpec["fonts"]) {
  for (const upload of fonts.uploads ?? []) ensureUploadedFont(upload);
  const uploaded = new Set((fonts.uploads ?? []).map((upload) => upload.family));
  for (const family of [fonts.heading, fonts.body, fonts.mono]) {
    if (!uploaded.has(family)) ensureGoogleFont(family);
  }
}

/** "satoshi-variable_bold.woff2" → "Satoshi Variable Bold" */
export function familyFromFileName(fileName: string) {
  return fileName
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .slice(0, 80);
}
