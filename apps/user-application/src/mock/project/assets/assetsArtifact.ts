import { assetsArtifactSchema, type AssetsArtifact, type DocumentAsset, type WireframeAsset } from "@stage/data-ops/contracts";
import {
  MOCK_WIREFRAMES_GENERATED_AT_LABEL,
  WIREFRAMES_RESULTS_PREVIEW_LIMIT,
} from "@/mock/project/wireframes/constants";
import { mockWireframesArtifact } from "@/mock/project/wireframes/wireframesArtifact";
import {
  ASSET_CATEGORY_ICONS,
  EXPORT_OPTIONS,
  MOCK_ASSETS_GENERATED_AT,
  MOCK_ASSETS_PROJECT_ID,
  WIREFRAME_ASSET_SOURCE,
  WIREFRAME_ASSET_TYPE,
} from "./constants";

export { MOCK_ASSETS_PROJECT_ID } from "./constants";

const CANONICAL_DOCUMENTS: DocumentAsset[] = [
  {
    id: "research-complete",
    title: "Brand Research Report",
    description: "Company overview, 4 competitors, market insights",
    status: "complete",
    dateLabel: "April 2",
    sourceModule: "research",
    artifactId: "mock-research-report",
  },
  {
    id: "research-shared",
    title: "Brand Research Report",
    description: "Company overview, 4 competitors, market insights",
    status: "shared",
    dateLabel: "April 2",
    sourceModule: "research",
    artifactId: "mock-research-report-shared",
  },
];

function buildWireframeAssets(): WireframeAsset[] {
  return mockWireframesArtifact.configureScreens
    .filter((screen) => screen.selected)
    .slice(0, WIREFRAMES_RESULTS_PREVIEW_LIMIT)
    .map((screen) => ({
      id: `wireframe-${screen.id}`,
      title: `${screen.title} Wireframe`,
      type: WIREFRAME_ASSET_TYPE,
      dateLabel: MOCK_WIREFRAMES_GENERATED_AT_LABEL,
      source: WIREFRAME_ASSET_SOURCE,
      priority: screen.priority,
      screenId: screen.id,
    }));
}

function buildAssetsArtifact(projectId: string, generatedAt: number): AssetsArtifact {
  const wireframes = buildWireframeAssets();
  const documents = CANONICAL_DOCUMENTS.map((document) => ({ ...document }));

  return {
    apiVersion: "v1",
    artifactKind: "assetsArtifact",
    projectId,
    title: "Project Assets",
    stats: {
      wireframeCount: wireframes.length,
      documentCount: documents.length,
      uploadedCount: 0,
    },
    wireframes,
    documents,
    uploadedAssets: [],
    exportOptions: EXPORT_OPTIONS.map((option) => ({ ...option })),
    categories: [
      { id: "wireframes", label: "Wireframes", iconSrc: ASSET_CATEGORY_ICONS.wireframes },
      { id: "documents", label: "Documents", iconSrc: ASSET_CATEGORY_ICONS.documents },
      { id: "uploaded", label: "Uploaded", iconSrc: ASSET_CATEGORY_ICONS.uploaded },
    ],
    generatedAt,
  };
}

export const mockAssetsArtifact = assetsArtifactSchema.parse(
  buildAssetsArtifact(MOCK_ASSETS_PROJECT_ID, MOCK_ASSETS_GENERATED_AT),
);

export function createMockAssetsArtifact(projectId: string): AssetsArtifact {
  return assetsArtifactSchema.parse(buildAssetsArtifact(projectId, MOCK_ASSETS_GENERATED_AT));
}

export { CANONICAL_DOCUMENTS };
