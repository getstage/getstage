import { wireframesArtifactSchema, type WireframesArtifact } from "@stage/data-ops/contracts";
import {
  FIGMA_SYMBOL_URL,
  MOCK_BRAND_KIT,
  MOCK_WIREFRAMES_GENERATED_AT,
  MOCK_WIREFRAMES_GENERATED_AT_LABEL,
  MOCK_WIREFRAMES_PROJECT_ID,
  WIREFRAMES_STATS,
} from "./constants";

const CANONICAL_CONFIGURE_SCREENS = [
  {
    id: "homepage",
    title: "Homepage",
    description: "Primary Landing - communicates value, drives demo conversion",
    kind: "Page" as const,
    priority: "P0",
    required: true,
    selected: true,
  },
  {
    id: "about",
    title: "About Us",
    description: "Describes company mission and vision",
    kind: "Section" as const,
    priority: "P1",
    required: false,
    selected: true,
  },
  {
    id: "features",
    title: "Features",
    description: "Highlights key functionalities, engages users",
    kind: "Page" as const,
    priority: "P2",
    required: true,
    selected: true,
  },
  {
    id: "pricing",
    title: "Pricing",
    description: "Details pricing tiers, promotes sign-up",
    kind: "Page" as const,
    priority: "P3",
    required: true,
    selected: true,
  },
  {
    id: "testimonials",
    title: "Testimonials",
    description: "Showcases user feedback, builds trust",
    kind: "Section" as const,
    priority: "P4",
    required: false,
    selected: true,
  },
  {
    id: "blog",
    title: "Blog",
    description: "Provides insights, fosters community engagement",
    kind: "Page" as const,
    priority: "P5",
    required: false,
    selected: true,
  },
  {
    id: "contact",
    title: "Contact Us",
    description: "Facilitates inquiries, supports user needs",
    kind: "Section" as const,
    priority: "P6",
    required: true,
    selected: true,
  },
  {
    id: "demo-request",
    title: "Demo Request",
    description: "Lead capture screen that qualifies buyers and sets expectations",
    kind: "Page" as const,
    priority: "P0",
    required: true,
    selected: false,
  },
  {
    id: "security",
    title: "Security",
    description: "Validates enterprise requirements before technical walkthrough",
    kind: "Page" as const,
    priority: "P1",
    required: false,
    selected: false,
  },
  {
    id: "client-portal",
    title: "Client Portal",
    description: "Workspace for progress review, milestone feedback, and approvals",
    kind: "Page" as const,
    priority: "P2",
    required: true,
    selected: false,
  },
  {
    id: "milestone-detail",
    title: "Milestone Detail",
    description: "Review deliverables and leave milestone feedback",
    kind: "Section" as const,
    priority: "P3",
    required: false,
    selected: false,
  },
  {
    id: "asset-handoff",
    title: "Asset Handoff",
    description: "Final delivery screen with files, usage rules, and version history",
    kind: "Page" as const,
    priority: "P4",
    required: true,
    selected: false,
  },
  {
    id: "calendar",
    title: "Calendar",
    description: "Demo scheduling selection after form submission",
    kind: "Section" as const,
    priority: "P5",
    required: false,
    selected: false,
  },
] as const;

function buildGeneratedScreens(
  configureScreens: WireframesArtifact["configureScreens"],
  generatedAtLabel: string,
): WireframesArtifact["generatedScreens"] {
  return configureScreens
    .filter((screen) => screen.selected)
    .map((screen) => ({
      id: screen.id,
      title: screen.title,
      priority: screen.priority,
      generatedAtLabel,
      sections: [],
    }));
}

function buildWireframesArtifact(
  projectId: string,
  generatedAt: number,
  overrides?: Partial<Pick<WireframesArtifact, "wireframeKind" | "brandSource" | "configureScreens">>,
): WireframesArtifact {
  const configureScreens = (overrides?.configureScreens ?? CANONICAL_CONFIGURE_SCREENS.map((screen) => ({ ...screen }))) as WireframesArtifact["configureScreens"];

  return {
    apiVersion: "v1",
    artifactKind: "wireframesArtifact",
    projectId,
    title: "Project Wireframes",
    wireframeKind: overrides?.wireframeKind ?? "lofi",
    brandSource: overrides?.brandSource,
    stats: { ...WIREFRAMES_STATS },
    configureScreens,
    brandKit: { ...MOCK_BRAND_KIT },
    generatedScreens: buildGeneratedScreens(configureScreens, MOCK_WIREFRAMES_GENERATED_AT_LABEL),
    generatedAt,
    generatedAtLabel: MOCK_WIREFRAMES_GENERATED_AT_LABEL,
    figmaSymbolUrl: FIGMA_SYMBOL_URL,
  };
}

export const mockWireframesArtifact = wireframesArtifactSchema.parse(
  buildWireframesArtifact(MOCK_WIREFRAMES_PROJECT_ID, MOCK_WIREFRAMES_GENERATED_AT),
);

export function createMockWireframesArtifact(
  projectId: string,
  overrides?: Partial<Pick<WireframesArtifact, "wireframeKind" | "brandSource" | "configureScreens">>,
): WireframesArtifact {
  return wireframesArtifactSchema.parse(
    buildWireframesArtifact(projectId, MOCK_WIREFRAMES_GENERATED_AT, overrides),
  );
}

export { CANONICAL_CONFIGURE_SCREENS };
