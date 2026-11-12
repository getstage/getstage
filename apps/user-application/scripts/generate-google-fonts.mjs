// Regenerates packages/data-ops/src/domain/googleFonts.json from Google's public font catalogue
// (no API key). Run: node scripts/generate-google-fonts.mjs
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const CATALOGUE_URL = "https://fonts.google.com/metadata/fonts";
const output = fileURLToPath(new URL("../../../packages/data-ops/src/domain/googleFonts.json", import.meta.url));

const response = await fetch(CATALOGUE_URL);
if (!response.ok) throw new Error(`Font catalogue request failed: ${response.status}`);
const text = await response.text();
const { familyMetadataList } = JSON.parse(text.slice(text.indexOf("{")));

// [family, category, upright weights], most popular first. Brand fonts (Google Sans
// and friends) are listed in the catalogue but not served by the css2 API.
const fonts = familyMetadataList
  .filter((font) => !font.isBrandFont)
  .sort((a, b) => a.popularity - b.popularity)
  .map((font) => {
    const weights = Object.keys(font.fonts)
      .filter((style) => !style.endsWith("i"))
      .map(Number)
      .sort((a, b) => a - b);
    return [font.family, font.category, weights];
  })
  .filter(([, , weights]) => weights.length > 0);

await writeFile(output, `${JSON.stringify(fonts)}\n`);
console.log(`Wrote ${fonts.length} fonts to ${output}`);
