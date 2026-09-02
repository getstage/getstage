import assert from "node:assert/strict";
import test from "node:test";
import type {
  MoodboardArtifact,
  ResearchArtifact,
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
  uiPatterns: [],
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
      imageUrl: "https://cdn.example.com/reference.webp",
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
      "assets/moodboard/editorial-reference.webp",
    ],
  );
  assert.match(bundle.files[0]?.content ?? "", /Read every exported document/);
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
