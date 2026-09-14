import assert from "node:assert/strict";
import test from "node:test";
import {
  deriveImportedWebId,
  existingSourceName,
  fallbackPreviewFromUrl,
  parseHomepagePreview,
  sourceFingerprint,
} from "./sitePreview";

test("deriveImportedWebId is kebab and stable", () => {
  assert.equal(deriveImportedWebId("ui.shadcn.com"), "web-ui-shadcn-com");
  assert.equal(deriveImportedWebId("www.radix-ui.com"), "web-radix-ui-com");
});

test("parseHomepagePreview prefers apple-touch-icon then og tags", () => {
  const html = `
    <html>
      <head>
        <title>Wrong title</title>
        <meta property="og:title" content="shadcn/ui">
        <meta property="og:description" content="Accessible React components.">
        <meta property="og:image" content="/og.png">
        <link rel="apple-touch-icon" href="/apple-icon.png">
        <link rel="icon" href="/favicon.ico">
      </head>
    </html>
  `;
  const preview = parseHomepagePreview(html, "https://ui.shadcn.com/docs");
  assert.equal(preview.name, "shadcn/ui");
  assert.equal(preview.subtitle, "Accessible React components.");
  assert.equal(preview.iconUrl, "https://ui.shadcn.com/apple-icon.png");
  assert.equal(preview.sourceUrl, "https://ui.shadcn.com");
});

test("parseHomepagePreview falls back to hostname and favicon.ico", () => {
  const preview = parseHomepagePreview("<html></html>", "https://example.com/kit");
  assert.equal(preview.name, "example.com");
  assert.equal(preview.subtitle, "");
  assert.equal(preview.iconUrl, "https://example.com/favicon.ico");
  assert.equal(preview.sourceUrl, "https://example.com");
});

test("fallbackPreviewFromUrl strips www and uses favicon.ico", () => {
  const preview = fallbackPreviewFromUrl("https://www.radix-ui.com/primitives");
  assert.equal(preview.name, "radix-ui.com");
  assert.equal(preview.iconUrl, "https://radix-ui.com/favicon.ico");
  assert.equal(preview.sourceUrl, "https://radix-ui.com");
});

test("aceternity.com and ui.aceternity.com are the same library", () => {
  assert.equal(sourceFingerprint("https://aceternity.com"), "web:aceternity.com");
  assert.equal(sourceFingerprint("https://ui.aceternity.com"), "web:aceternity.com");
  assert.equal(sourceFingerprint("https://www.ui.aceternity.com/docs"), "web:aceternity.com");
  assert.equal(
    existingSourceName("https://aceternity.com", [
      { name: "Aceternity UI", sourceUrl: "https://ui.aceternity.com" },
    ]),
    "Aceternity UI",
  );
});

test("github fingerprints stay per-repo", () => {
  assert.equal(
    sourceFingerprint("https://github.com/Leonxlnx/taste-skill"),
    "gh:leonxlnx/taste-skill",
  );
  assert.notEqual(
    sourceFingerprint("https://github.com/Leonxlnx/taste-skill"),
    sourceFingerprint("https://github.com/anthropics/skills"),
  );
  assert.equal(
    existingSourceName("https://magicui.design", [
      { name: "Aceternity UI", sourceUrl: "https://ui.aceternity.com" },
    ]),
    null,
  );
});
