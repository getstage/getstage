import assert from "node:assert/strict";
import test from "node:test";
import { familyFromFileName } from "@stage/project-ui/fonts/uploadedFonts";

test("an uploaded file's name becomes a readable family name", () => {
  assert.equal(familyFromFileName("satoshi-variable_bold.woff2"), "Satoshi Variable Bold");
  assert.equal(familyFromFileName("BrandSans.otf"), "BrandSans");
});
