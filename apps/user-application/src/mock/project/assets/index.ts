import { assetsArtifactSchema, type AssetsArtifact } from "@stage/data-ops/contracts";
import { mapAssetsArtifactToTabData } from "@/lib/project/mapAssetsArtifactToTabData";
import type { AssetsArtifactRecord } from "@/types/project/assetsArtifactRecord";
import { createMockAssetsArtifact, mockAssetsArtifact, MOCK_ASSETS_PROJECT_ID } from "./assetsArtifact";

export { createMockAssetsArtifact, mockAssetsArtifact, MOCK_ASSETS_PROJECT_ID, CANONICAL_DOCUMENTS } from "./assetsArtifact";
export {
  ASSET_CATEGORY_ICONS,
  DOCUMENT_STATUS_CLASSES,
  DOCUMENT_STATUS_LABELS,
  EXPORT_OPTIONS,
  UPLOAD_STATUS_CLASSES,
  UPLOAD_STATUS_LABELS,
  WIREFRAME_ASSET_SOURCE,
  WIREFRAME_ASSET_TYPE,
} from "./constants";
export {
  createSeedAssetCategories,
  createSeedDocuments,
  createSeedExportOptions,
  createSeedWireframeAssets,
} from "./tabSeed";

/** Simulate backend assets in dev until Convex returns a saved artifact. */
export const USE_MOCK_ASSETS_DATA = import.meta.env.DEV;

const MOCK_ASSETS_STORAGE_PREFIX = "stage:mock-assets-artifact:";

export function buildAssetsArtifactRecord(
  projectId: string,
  artifact: AssetsArtifact,
  id = `mock-assets-${projectId}`,
): AssetsArtifactRecord {
  return {
    id,
    projectId,
    runId: null,
    title: artifact.title,
    summary: null,
    status: "ready",
    createdAt: artifact.generatedAt,
    updatedAt: artifact.generatedAt,
    artifact,
    tabData: mapAssetsArtifactToTabData(artifact),
  };
}

export function getMockAssetsArtifact(projectId: string): AssetsArtifact {
  return projectId === MOCK_ASSETS_PROJECT_ID ? mockAssetsArtifact : createMockAssetsArtifact(projectId);
}

export function getMockAssetsArtifactRecord(projectId: string): AssetsArtifactRecord {
  return buildAssetsArtifactRecord(projectId, getMockAssetsArtifact(projectId));
}

export function getSeedAssetsTabData() {
  return mapAssetsArtifactToTabData(mockAssetsArtifact);
}

export function loadMockAssetsArtifactRecord(projectId: string): AssetsArtifactRecord | null {
  if (!USE_MOCK_ASSETS_DATA) {
    return null;
  }

  try {
    const raw = sessionStorage.getItem(`${MOCK_ASSETS_STORAGE_PREFIX}${projectId}`);
    if (!raw) {
      return null;
    }

    const artifact = assetsArtifactSchema.parse(JSON.parse(raw) as unknown);
    return buildAssetsArtifactRecord(projectId, artifact);
  } catch {
    return null;
  }
}

export function saveMockAssetsArtifactRecord(projectId: string, record: AssetsArtifactRecord) {
  if (!USE_MOCK_ASSETS_DATA) {
    return;
  }

  sessionStorage.setItem(`${MOCK_ASSETS_STORAGE_PREFIX}${projectId}`, JSON.stringify(record.artifact));
}

export function clearMockAssetsArtifactRecord(projectId: string) {
  sessionStorage.removeItem(`${MOCK_ASSETS_STORAGE_PREFIX}${projectId}`);
}
