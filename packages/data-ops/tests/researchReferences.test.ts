import { describe, expect, it } from "vitest";
import { buildUiPatterns, groupPatternInsights, referenceSearches, takeUniqueScreens } from "../src/domain/researchReferences";

const input = { industry: "SaaS", brief: "A board for one product squad to plan issues with the weekly cycle", screenTypes: [] as string[] };

describe("Research references (engine port)", () => {
  it("searches Refero per app screen type with the engine's queries", () => {
    const searches = referenceSearches({ ...input, category: "web-apps", screenTypes: ["Onboarding", "Settings"] });
    expect(searches.map((search) => search.id)).toEqual(["ui-patterns-onboarding", "ui-patterns-settings"]);
    expect(searches[0]).toMatchObject({ source: "refero", platform: "web", query: "account signup onboarding wizard first run SaaS board squad plan issues weekly" });
    expect(searches[1]!.query).toMatch(/^web app Settings interface SaaS/);
  });

  it("falls back to the five defaults when a type is unknown, and uses iOS queries for iOS", () => {
    const searches = referenceSearches({ ...input, category: "ios-apps", screenTypes: ["Hero"] });
    expect(searches.map((search) => search.title)).toEqual(["Onboarding", "Homepage", "Pricing", "Checkout", "Dashboard"]);
    expect(searches[0]).toMatchObject({ platform: "ios", query: expect.stringMatching(/^mobile app onboarding signup first run/) });
  });

  it("searches Details per website section", () => {
    const searches = referenceSearches({ ...input, category: "websites", screenTypes: ["Hero", "Pricing"] });
    expect(searches).toEqual([
      { id: "ui-patterns-hero", title: "Hero", source: "details", platform: "web", query: "marketing website Hero section" },
      { id: "ui-patterns-pricing", title: "Pricing", source: "details", platform: "web", query: "marketing website Pricing section" },
    ]);
  });

  it("never repeats a screen across groups and keeps 4 per group", () => {
    const screen = (id: string) => ({ id, title: id });
    const unique = takeUniqueScreens([["a", "b"].map(screen), ["b", "c", "d", "e", "f"].map(screen)]);
    expect(unique.map((screens) => screens.map((entry) => entry.id))).toEqual([["a", "b"], ["c", "d", "e", "f"]]);
  });

  it("builds the Research screen's groups from the screens and the AI's recognized patterns", () => {
    const groups = [{ id: "ui-patterns-pricing", title: "Pricing", screens: [{ id: "s1", title: "Linear pricing", productName: "Linear", thumbnailUrl: "https://images.refero.design/s1.jpg" }] }];
    const { insights, problems } = groupPatternInsights(groups, [{
      groupId: "ui-patterns-pricing",
      patterns: [
        { title: "Plan toggle", description: "Monthly and yearly switch sits above the plans" },
        { title: "Highlighted tier", description: "The middle plan carries the strongest visual weight" },
      ],
    }]);
    expect(problems).toEqual([]);
    expect(buildUiPatterns(groups, insights)).toEqual([{
      id: "ui-patterns-pricing",
      title: "Pricing",
      summary: "Pricing references from screens from Linear provide focused design inspiration.",
      patternCountLabel: "2 recognized patterns from 1 reference screens",
      recognizedPatterns: ["Plan toggle — Monthly and yearly switch sits above the plans", "Highlighted tier — The middle plan carries the strongest visual weight"],
      examples: [{ id: "s1", title: "Linear pricing", imageUrl: "https://images.refero.design/s1.jpg", thumbnailUrl: "https://images.refero.design/s1.jpg", sourceProduct: "Linear", sourceReferenceId: "s1" }],
    }]);
  });

  it("names every group without usable patterns", () => {
    const groups = [{ id: "ui-patterns-hero", title: "Hero", screens: [{ id: "s1", title: "Hero" }] }];
    expect(groupPatternInsights(groups, [{ groupId: "ui-patterns-hero", patterns: [{ title: "Big", description: "x" }] }]).problems)
      .toEqual(['uiPatternInsights "ui-patterns-hero": 2–4 patterns seen in its screens (title up to 6 words, description at least 4 words)']);
  });
});
