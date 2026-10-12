import assert from "node:assert/strict";
import test from "node:test";
import type { MoodboardStyleGuide } from "@stage/data-ops/contracts";
import type { MoodboardItem } from "@/types/project/moodboardTab";
import { readableOn, resolveStyleGuideSpec, shadcnThemeVars, styleGuideDesignMarkdown } from "./styleGuideSpec";

const guide = {
  id: "guide-1",
  directionId: "dir-1",
  title: "Bold — Style Guide",
  subtitle: "Raw grid, heavy type.",
  categoryConventions: [],
  researchReferenceIds: [],
  implementationNotes: ["One primary action per screen."],
  atmosphere: [],
  colorPalettes: [
    { label: "Signal", hex: "#E5484D", colors: ["#E5484D"] },
    { label: "Neutral", hex: "#71717A", colors: ["#FAFAFA", "#E4E4E7", "#A1A1AA", "#27272A", "#09090B"] },
  ],
  typography: { fontFamily: "Archivo Black", fontFamilies: [], previewSize: 28, rows: [], weightSamples: [] },
  componentSwatchCount: 6,
} satisfies MoodboardStyleGuide;

const references = [
  { id: "ref-1", title: "Linear", image: "thumb.jpg", imageUrl: "https://assets/ref-1.jpg", folder: null, directionId: "dir-1", isInMoodboard: true },
] satisfies MoodboardItem[];

test("generated values fill every section the team has not edited", () => {
  const spec = resolveStyleGuideSpec(guide, "Bold", references);
  assert.equal(spec.intent.name, "Bold");
  assert.equal(spec.colors.light.primary, "#E5484D");
  assert.equal(spec.colors.light.text, "#09090B");
  assert.deepEqual(spec.rules.do, ["One primary action per screen."]);
  assert.equal(spec.references[0]?.referenceId, "ref-1");
});

test("team edits override only their own section", () => {
  const edited = { ...guide, spec: { shape: { corners: 0, depth: "hard" as const, density: "compact" as const } } };
  const spec = resolveStyleGuideSpec(edited, "Bold", references);
  assert.equal(spec.shape.corners, 0);
  assert.equal(spec.colors.light.primary, "#E5484D");
});

test("shadcn variables follow the chosen mode and keep text readable on primary", () => {
  const spec = resolveStyleGuideSpec(guide, "Bold", references);
  const dark = shadcnThemeVars(spec, "dark") as Record<string, string>;
  assert.equal(dark["--background"], spec.colors.dark.background);
  assert.equal(dark["--radius"], `${spec.shape.corners}px`);
  assert.equal(readableOn("#FFFFFF"), "#0A0A0A");
  assert.equal(readableOn("#18181B"), "#FFFFFF");
});

test("DESIGN.md lists references with their image so Claude Code can open them", () => {
  const markdown = styleGuideDesignMarkdown(resolveStyleGuideSpec(guide, "Bold", references), references);
  assert.match(markdown, /!\[Linear\]\(https:\/\/assets\/ref-1\.jpg\)/);
  assert.match(markdown, /Look at it when building: Everything/);
});
