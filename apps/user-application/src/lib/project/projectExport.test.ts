import assert from "node:assert/strict";
import test from "node:test";
import type {
  AssetsArtifact,
  FlowsArtifact,
  MoodboardArtifact,
  ResearchArtifact,
  StrategyArtifact,
  WireframesArtifact,
} from "@stage/data-ops/contracts";
import { buildProjectExport } from "./projectExport";

const research = {
  apiVersion: "v1",
  artifactKind: "researchArtifact",
  projectId: "project-1",
  title: "Research",
  summary: ["Summary"],
  companySnapshot: [{ label: "Market", value: "B2B" }],
  competitiveAnalysis: {
    competitors: [
      {
        id: "competitor-1",
        name: "Example",
        logoUrl: "https://cdn.example.com/example-logo.png",
        strengths: [],
        weaknesses: [],
        sourceReferenceIds: [],
      },
    ],
    matrixRows: [],
  },
  uiPatterns: [
    {
      id: "pattern-1",
      title: "Onboarding",
      summary: "Keep account creation focused.",
      patternCountLabel: "1 reference",
      recognizedPatterns: ["One primary action per step"],
      examples: [
        {
          id: "example-1",
          title: "Intercom signup",
          imageUrl: "https://assets.example.com/missing-full-image.jpg",
          thumbnailUrl: "https://images.example.com/intercom-thumbnail.jpg",
          sourceProduct: "Intercom",
        },
      ],
    },
  ],
  targetUsers: [
    {
      id: "user-1",
      name: "Buyer",
      role: "Buyer",
      goals: [],
      frustrations: [],
      assumptions: [],
    },
  ],
  opportunities: [{ id: "opportunity-1", description: "Make buying easier" }],
  customSections: [],
  openQuestions: [],
  sourceReferences: [],
  generatedAt: 1,
} satisfies ResearchArtifact;

const moodboard = {
  apiVersion: "v1",
  artifactKind: "moodboardArtifact",
  projectId: "project-1",
  title: "Moodboard",
  directions: [{ id: "direction-1", name: "Calm", hasStyleGuide: true }],
  references: [
    {
      id: "reference-1",
      title: "Editorial reference",
      imageUrl: "https://cdn.example.com/reference",
      thumbnailUrl: "https://cdn.example.com/reference-thumbnail.webp",
      source: "url",
      directionId: "direction-1",
      isInMoodboard: true,
    },
  ],
  uploadedFiles: [],
  styleGuides: [
    {
      id: "style-1",
      directionId: "direction-1",
      title: "Calm",
      atmosphere: [],
      colorPalettes: [
        { label: "Primary", hex: "#000000", colors: ["#000000"] },
      ],
      typography: {
        fontFamily: "Inter",
        fontFamilies: [],
        previewSize: 28,
        rows: [],
        weightSamples: [],
      },
      componentSwatchCount: 6,
    },
  ],
  generatedAt: 1,
} satisfies MoodboardArtifact;

const strategy = {
  apiVersion: "v1",
  artifactKind: "strategyArtifact",
  projectId: "project-1",
  title: "Product Strategy",
  sections: [
    {
      id: "section-1",
      title: "Design principles",
      status: "action",
      kind: "principles",
      principles: [
        {
          title: "Make decisions visible",
          body: "Show the information people need to act.",
          research: "Operators prioritise current work.",
        },
      ],
    },
    {
      id: "section-2",
      title: "Target audience",
      status: "approved",
      kind: "table",
      table: [
        ["Audience", "Primary need"],
        ["Buyer", "Compare suppliers quickly"],
      ],
    },
  ],
  generatedAt: 1,
} satisfies StrategyArtifact;

const flows = {
  apiVersion: "v1",
  artifactKind: "flowsArtifact",
  projectId: "project-1",
  title: "Product Flows",
  flows: [{
    id: "flow-1",
    title: "Create account",
    description: "Move a visitor into the product.",
    status: "Approved",
    category: "Onboarding",
    screenCount: 2,
    steps: [{ id: "step-1", order: 0, label: "Open signup" }],
  }],
  screens: [{
    id: "screen-1",
    title: "Signup",
    description: "Account creation form.",
    flowCount: 1,
    keyElements: ["Email field", "Primary action"],
  }],
  generatedAt: 1,
} satisfies FlowsArtifact;

const wireframes = {
  apiVersion: "v1",
  artifactKind: "wireframesArtifact",
  projectId: "project-1",
  title: "Product Wireframes",
  wireframeKind: "hifi",
  brandSource: "style-guide",
  stats: { flowsScreenCount: 1, moodboardPatternCount: 1, totalConfigureScreenCount: 1 },
  configureScreens: [],
  generatedScreens: [{
    id: "screen-1",
    title: "Signup",
    priority: "P0",
    generatedAtLabel: "Today",
    goal: "Create an account.",
    sections: [{
      id: "section-1",
      title: "Form",
      blocks: [{
        id: "block-1",
        kind: "form",
        intent: "Collect account details.",
        emphasis: "primary",
      }],
    }],
    html: "<main>Signup</main>",
  }],
  generatedAt: 1,
  generatedAtLabel: "Today",
  figmaSymbolUrl: "https://figma.example.com/symbol",
} satisfies WireframesArtifact;

const assets = {
  apiVersion: "v1",
  artifactKind: "assetsArtifact",
  projectId: "project-1",
  title: "Project Assets",
  stats: { wireframeCount: 0, documentCount: 1, uploadedCount: 1 },
  wireframes: [],
  documents: [{
    id: "document-1",
    title: "Brief",
    description: "Approved project brief.",
    status: "complete",
    dateLabel: "Today",
  }],
  uploadedAssets: [],
  exportOptions: [],
  categories: [],
  generatedAt: 1,
} satisfies AssetsArtifact;

test("buildProjectExport includes only selected artifacts and their assets", () => {
  const bundle = buildProjectExport({
    project: { name: "Example", clientName: "Client", typeLabel: "Web App" },
    selected: new Set(["research", "moodboard", "styleGuide"]),
    artifacts: { research, moodboard },
    uploadedAssets: [],
  });

  assert.deepEqual(
    bundle.files.map(({ relativePath }) => relativePath),
    [
      "AGENTS.md",
      "project.md",
      "research.md",
      "moodboard.md",
      "style-guide.md",
    ],
  );
  assert.deepEqual(
    bundle.assets.map(({ relativePath }) => relativePath),
    [
      "assets/research/example-logo.png",
      "assets/research/intercom-signup.jpg",
      "assets/moodboard/editorial-reference",
    ],
  );
  assert.match(bundle.files[0]?.content ?? "", /Read every exported document/);
  const researchMarkdown =
    bundle.files.find(({ relativePath }) => relativePath === "research.md")
      ?.content ?? "";
  assert.match(researchMarkdown, /## Summary\n\n- Summary/);
  assert.match(researchMarkdown, /### Example/);
  assert.match(
    researchMarkdown,
    /!\[Intercom signup\]\(.\/assets\/research\/intercom-signup\.jpg\)/,
  );
  assert.equal(
    bundle.assets[1]?.url,
    "https://images.example.com/intercom-thumbnail.jpg",
  );
  const moodboardMarkdown =
    bundle.files.find(({ relativePath }) => relativePath === "moodboard.md")
      ?.content ?? "";
  assert.match(
    moodboardMarkdown,
    /!\[Editorial reference\]\(.\/assets\/moodboard\/editorial-reference\)/,
  );
  assert.equal(bundle.assets[2]?.url, "https://cdn.example.com/reference");
  assert.doesNotMatch(researchMarkdown, /```json|"artifactKind"/);
  assert.doesNotMatch(researchMarkdown, /referoContext|competitor-1|example-1/);
});

test("buildProjectExport keeps uploads optional and skips missing URLs", () => {
  const bundle = buildProjectExport({
    project: { name: "Example", clientName: "", typeLabel: "Other" },
    selected: new Set(["assets"]),
    artifacts: {},
    uploadedAssets: [
      {
        title: "brief.pdf",
        url: "https://cdn.example.com/file",
        mimeType: "application/pdf",
      },
      { title: "missing.png", url: null, mimeType: "image/png" },
    ],
  });

  assert.equal(bundle.assets.length, 1);
  assert.equal(bundle.assets[0]?.relativePath, "assets/uploads/brief.pdf");
  assert.ok(
    bundle.files.some(({ relativePath }) => relativePath === "assets.md"),
  );
});

test("buildProjectExport writes strategy as a document, not an object dump", () => {
  const bundle = buildProjectExport({
    project: { name: "Example", clientName: "Client", typeLabel: "Web App" },
    selected: new Set(["strategy"]),
    artifacts: { strategy },
    uploadedAssets: [],
  });
  const markdown =
    bundle.files.find(({ relativePath }) => relativePath === "strategy.md")
      ?.content ?? "";

  assert.match(markdown, /## Design principles/);
  assert.match(markdown, /### Make decisions visible/);
  assert.match(markdown, /\| Audience \| Primary need \|/);
  assert.doesNotMatch(markdown, /\*\*(Status|Kind):\*\*|```json|section-1/);
});

test("every exported project section uses curated readable Markdown", () => {
  const bundle = buildProjectExport({
    project: { name: "Example", clientName: "Client", typeLabel: "Web App" },
    selected: new Set(["moodboard", "styleGuide", "flows", "wireframes", "assets"]),
    artifacts: { moodboard, flows, wireframes, assets },
    uploadedAssets: [{
      title: "brief.pdf",
      url: "https://cdn.example.com/brief.pdf",
      mimeType: "application/pdf",
    }],
  });
  const content = Object.fromEntries(
    bundle.files.map((exportedFile) => [exportedFile.relativePath, exportedFile.content]),
  );

  assert.match(content["moodboard.md"] ?? "", /## Creative directions/);
  assert.match(content["style-guide.md"] ?? "", /### Colour palettes/);
  assert.match(content["flows.md"] ?? "", /## User flows[\s\S]*1\. Open signup/);
  assert.match(content["wireframes.md"] ?? "", /#### Hi-Fi source[\s\S]*<main>Signup<\/main>/);
  assert.match(content["assets.md"] ?? "", /\[brief\.pdf\]\(.\/assets\/uploads\/brief\.pdf\)/);
  for (const markdown of Object.values(content)) {
    assert.doesNotMatch(markdown, /```json|artifactKind|project-1|section-1|block-1/);
  }
});
