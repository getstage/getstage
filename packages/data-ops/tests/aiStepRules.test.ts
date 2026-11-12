import { describe, expect, it } from "vitest";
import { flowsArtifactSchema } from "../src/contracts/flows";
import { generatedStyleGuideSchema } from "../src/contracts/moodboard";
import { researchArtifactSchema } from "../src/contracts/research";
import { strategyArtifactSchema } from "../src/contracts/strategy";
import { wireframesArtifactSchema } from "../src/contracts/wireframes";
import { aiStepProblems, assertNoProblems, sanitizeWireframeHtml, staleSteps, styleGuideProblems } from "../src/domain/aiStepRules";

const envelope = { apiVersion: "v1", projectId: "p1", title: "Result", generatedAt: 1 } as const;

const research = researchArtifactSchema.parse({
  ...envelope,
  artifactKind: "researchArtifact",
  summary: ["Benchmarked three booking sites.", "Card grids dominate the listings.", "Checkout is the biggest gap."],
  companySnapshot: [{ label: "Industry", value: "Travel booking" }],
  competitiveAnalysis: {
    competitors: ["Airbnb", "Booking"].map((name, index) => ({ id: `c${index + 1}`, name, summary: `${name} is a marketplace for stays.`, strengths: ["Clear listing cards", "Map and list side by side", "Saved searches"], weaknesses: ["Fees appear late", "Dense filters", "Slow checkout"], sourceReferenceIds: ["s1"] })),
    matrixRows: ["Navigation", "Onboarding", "Visual Style", "Content Hierarchy", "Mobile Experience", "Dashboard Layout", "Data Visualization"]
      .map((label) => ({ id: label, label, cells: [{ competitorId: "c1", score: "Strong" }, { competitorId: "c2", score: "OK" }] })),
  },
  targetUsers: [{ id: "u1", name: "Sam", role: "Traveller", goals: ["Book a stay fast"], frustrations: ["Hidden fees at checkout"] }],
  opportunities: [
    { id: "o1", title: "Price first", description: "Show the full price on every listing card." },
    { id: "o2", title: "Short checkout", description: "Shorten checkout to two steps." },
    { id: "o3", title: "Map and list", description: "Add map and list views side by side." },
  ],
  sourceReferences: [{ id: "s1", provider: "website", label: "Airbnb home", url: "https://www.airbnb.com" }],
  uiPatterns: ["Listing", "Checkout"].map((title) => ({
    id: title,
    title,
    examples: ["a", "b"].map((id) => ({ id, title: `${title} ${id}`, thumbnailUrl: `https://images.refero.design/screenshots/${id}_thumb.jpg` })),
  })),
});

const strategySections = [
  { id: "direction", kind: "plain", body: ["Make booking feel calm and honest."] },
  { id: "principles", kind: "principles", principles: [{ title: "Price first", body: "Show the full price up front." }] },
  { id: "audience", kind: "table", table: [["Primary", "Weekend travellers"]] },
  { id: "content", kind: "paragraph", body: ["Voice: warm and direct."] },
  { id: "positioning", kind: "boxes", boxes: ["FOLLOW", "BREAK", "AVOID"].map((title) => ({ title, bullets: ["Clear listing cards"] })) },
  { id: "pages", kind: "cards", cards: ["Home", "Listing", "Checkout"].map((title) => ({ title, objective: "Move to booking", kpi: "Conversion", keyElement: "Price card" })) },
  { id: "accessibility", kind: "table", table: [["Contrast", "WCAG AA everywhere"]] },
].map((section) => ({ ...section, title: section.id, status: "action" }));
const strategy = strategyArtifactSchema.parse({ ...envelope, artifactKind: "strategyArtifact", sections: strategySections });

const flows = flowsArtifactSchema.parse({
  ...envelope,
  artifactKind: "flowsArtifact",
  flows: [{ id: "f1", title: "Book", description: "Find and book a stay", status: "Draft", category: "Conversion", screenCount: 1, steps: [{ id: "st1", order: 0, label: "Home", screenId: "home" }] }],
  screens: [{ id: "home", title: "Home", description: "Search and featured stays", flowCount: 1, keyElements: ["Search bar"] }],
});

const wireframes = wireframesArtifactSchema.parse({
  ...envelope,
  artifactKind: "wireframesArtifact",
  wireframeKind: "hifi",
  stats: { flowsScreenCount: 1, moodboardPatternCount: 0, totalConfigureScreenCount: 1 },
  generatedScreens: [{ id: "home", title: "Home", priority: "High", generatedAtLabel: "Today", sections: [{ id: "hero", title: "Hero", blocks: [{ id: "b1", kind: "hero", intent: "Search for a stay" }] }], html: "<div><h1>Stay</h1></div>" }],
  generatedAtLabel: "Today",
  figmaSymbolUrl: "https://figma.com/",
});

describe("AI step content rules (MCP saves)", () => {
  it("accepts complete results", () => {
    expect(aiStepProblems({ step: "research", artifact: research })).toEqual([]);
    expect(aiStepProblems({ step: "strategy", artifact: strategy })).toEqual([]);
    expect(aiStepProblems({ step: "flows", artifact: flows })).toEqual([]);
    expect(aiStepProblems({ step: "generate", artifact: wireframes, flowsScreenIds: new Set(["home"]) })).toEqual([]);
  });

  it("refuses placeholder text and Research without a source URL", () => {
    const junk = { ...research, companySnapshot: [{ label: "Industry", value: "x" }], sourceReferences: [{ id: "s1", provider: "user" as const, label: "Notes" }] };
    const problems = aiStepProblems({ step: "research", artifact: junk });
    expect(problems).toContain('companySnapshot[0].value: "x" is a placeholder, not content');
    expect(problems.some((problem) => problem.startsWith("sourceReferences:"))).toBe(true);
  });

  it("refuses empty competitor cards", () => {
    const [first, second] = research.competitiveAnalysis.competitors;
    const thin = { ...research, competitiveAnalysis: { ...research.competitiveAnalysis, competitors: [{ ...first!, strengths: [], weaknesses: [] }, second!] } };
    const problems = aiStepProblems({ step: "research", artifact: thin });
    expect(problems).toContain("competitiveAnalysis.competitors[0].strengths: needs 3–5 items, got 0");
    expect(problems).toContain("competitiveAnalysis.competitors[0].weaknesses: needs 3–5 items, got 0");
  });

  it("refuses a Strategy without the seven sections", () => {
    const problems = aiStepProblems({ step: "strategy", artifact: { ...strategy, sections: strategy.sections.slice(0, 1) } });
    expect(problems[0]).toMatch(/^sections: needs exactly 7 sections/);
  });

  it("refuses flow steps and wireframe screens that point at missing screens", () => {
    const broken = { ...flows, flows: [{ ...flows.flows[0]!, steps: [{ id: "st1", order: 0, label: "Home", screenId: "sc-missing" }] }] };
    expect(aiStepProblems({ step: "flows", artifact: broken })).toContain('flows[0].steps[0].screenId: "sc-missing" is not in screens');
    const ghost = { ...wireframes, generatedScreens: [{ ...wireframes.generatedScreens[0]!, id: "ghost-screen" }] };
    expect(aiStepProblems({ step: "generate", artifact: ghost, flowsScreenIds: new Set(["home"]) }))
      .toContain('generatedScreens[0].id: "ghost-screen" is not a screen in the saved Flows');
  });

  it("refuses a palette with pure black and an out-of-range highlight", () => {
    const guide = generatedStyleGuideSchema.parse({
      colorPalettes: [{ label: "Brand", hex: "#FF00FF", colors: ["#000000", "#FF00FF"], highlightIndex: 5 }],
      typography: { fontFamily: "Geist", rows: [{ id: "h1", size: 32, weight: "600", lineHeight: "120%", className: "text-[32px]" }] },
    });
    const problems = styleGuideProblems(guide);
    expect(problems).toContain("colorPalettes[0].colors: needs 8–11 items, got 2");
    expect(problems).toContain("colorPalettes[0].colors[0]: no pure black #000000; use a toned near-black");
    expect(problems).toContain("colorPalettes[0].highlightIndex: 5 is outside the 2 colours");
  });

  it("names every problem on one line", () => {
    expect(() => assertNoProblems("Research", ["a: bad", "b: bad"])).toThrow("Research was not saved. Fix and save again: a: bad; b: bad");
  });
});

describe("wireframe HTML", () => {
  it("removes scripts, frames, event handlers and javascript: links, keeps styles", () => {
    const clean = sanitizeWireframeHtml(
      `<div><style>.a{color:red}</style><script>alert(1)</script><img src="x.png" onerror="alert(2)"><a href="javascript:alert(3)" onclick='go()'>Go</a><iframe src="https://e.vil"></iframe><SCRIPT src=//a.js></SCRIPT><button onClick=go()>B</button></div>`,
    );
    expect(clean).toBe(`<div><style>.a{color:red}</style><img src="x.png"><a href="#">Go</a><button>B</button></div>`);
  });
});

describe("stale steps", () => {
  const saved = (id: string, content: Record<string, unknown> = {}) => ({ id, content });

  it("flags Flows and Wireframes built on a replaced Research or Strategy", () => {
    expect(staleSteps({
      research: saved("r2"),
      strategy: null,
      flows: saved("f1", { researchArtifactId: "r1", strategyArtifactId: "s1" }),
      wireframes: saved("w1", { strategyArtifactId: "s1", flowsArtifactId: "f1" }),
    })).toEqual(["flows", "wireframes"]);
  });

  it("carries staleness to the steps built on a stale step", () => {
    // New Research: Strategy points at the old one; Flows and Wireframes point at that (unchanged) Strategy.
    expect(staleSteps({
      research: saved("r2"),
      strategy: saved("s1", { researchArtifactId: "r1" }),
      flows: saved("f1", { strategyArtifactId: "s1" }),
      wireframes: saved("w1", { strategyArtifactId: "s1", flowsArtifactId: "f1" }),
    })).toEqual(["strategy", "flows", "wireframes"]);
  });

  it("is empty when everything points at the current results", () => {
    expect(staleSteps({
      research: saved("r1"),
      strategy: saved("s1"),
      flows: saved("f1", { researchArtifactId: "r1", strategyArtifactId: "s1" }),
      wireframes: saved("w1", { strategyArtifactId: "s1", flowsArtifactId: "f1" }),
    })).toEqual([]);
  });
});
