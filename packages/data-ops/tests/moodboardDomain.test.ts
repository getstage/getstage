import { describe, expect, it } from "vitest";
import {
  appendMoodboardReferences,
  directionHasImages,
  directionIdFromName,
  emptyMoodboardArtifact,
  mergeStyleGuide,
  normalizeStyleGuide,
  repairFontFamily,
  researchReferenceIds,
} from "../src/domain/moodboard";

const reference = { id: "refero-1", title: "Pricing", imageUrl: "https://cdn.example.com/a.png", imageAssetKey: "moodboard/a.png", source: "url" as const };
const generated = {
  atmosphere: [],
  colorPalettes: [],
  typography: { fontFamily: "Inter, sans-serif", previewSize: 28, rows: [], weightSamples: [], fontFamilies: [] },
  componentSwatchCount: 6,
};

describe("moodboard domain", () => {
  it("keys directions by name like the Mac app", () => {
    expect(directionIdFromName("  Calm Editorial ")).toBe("direction-calm-editorial");
    expect(directionIdFromName("!!!")).toBe("direction-untitled");
  });

  it("adds references into a new direction, after existing ones", () => {
    const start = appendMoodboardReferences(emptyMoodboardArtifact("p1", "Moodboard", 1), [reference], { importMode: "ai", generatedAt: 2 });
    expect(start.references[0]).toMatchObject({ directionId: null, isInMoodboard: false, order: 0 });

    const next = appendMoodboardReferences(start, [{ ...reference, id: "refero-2" }], { importMode: "ai", directionName: "Calm Editorial", generatedAt: 3 });
    expect(next.directions).toEqual([{ id: "direction-calm-editorial", name: "Calm Editorial", hasStyleGuide: false }]);
    expect(next.references[1]).toMatchObject({ directionId: "direction-calm-editorial", isInMoodboard: true, order: 1 });
    expect(directionHasImages(next, "direction-calm-editorial")).toBe(true);
  });

  it("normalizes a generated style guide like the engine (banned font, grounding) and merges it", () => {
    const board = appendMoodboardReferences(emptyMoodboardArtifact("p1", "Moodboard", 1), [reference], { importMode: "ai", directionName: "Calm", generatedAt: 2 });
    const guide = normalizeStyleGuide(generated, { id: "sg-1", directionId: "direction-calm", directionName: "Calm", category: "web-apps", researchReferenceIds: ["r1"] });
    expect(guide.typography.fontFamily).toBe("Geist");
    expect(guide.title).toBe("Calm Style Guide");
    expect(guide.categoryConventions).toHaveLength(3);
    expect(guide.researchReferenceIds).toEqual(["r1"]);

    const merged = mergeStyleGuide(board, guide);
    expect(merged.directions[0]).toMatchObject({ hasStyleGuide: true, styleGuideId: "sg-1" });
    expect(mergeStyleGuide(merged, { ...guide, id: "sg-2" }).styleGuides).toHaveLength(1);
  });

  it("collects Research reference ids without repeats", () => {
    expect(researchReferenceIds({
      sourceReferences: [{ id: "a", provider: "website", label: "A" }, { id: "a", provider: "website", label: "A" }],
      uiPatterns: [{ id: "g", title: "G", recognizedPatterns: [], examples: [{ id: "e", title: "E", sourceReferenceId: "b" }, { id: "f", title: "F", sourceReferenceId: null }] }],
    })).toEqual(["a", "b"]);
  });

  it("repairs banned fonts the same way everywhere a style guide keeps one", () => {
    expect(repairFontFamily("Inter, sans-serif")).toBe("Geist");
    expect(repairFontFamily("'Helvetica Neue'")).toBe("Geist");
    expect(repairFontFamily("Space Grotesk")).toBe("Space Grotesk");
  });
});
