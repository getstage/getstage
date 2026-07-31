import { wireframesArtifactSchema, type WireframesArtifact, type WireframeBrandSource, type WireframeKind } from "@stage/data-ops/contracts";
import { mapWireframesArtifactToTabData } from "@/lib/project/mapWireframesArtifactToTabData";
import type { WireframesArtifactRecord } from "@/types/project/wireframesArtifactRecord";
import type { ScreenItem } from "@/types/project/wireframesTab";
import { delay } from "@/mock/project/research";
import {
  createMockWireframesArtifact,
  mockWireframesArtifact,
} from "./wireframesArtifact";
import {
  MOCK_WIREFRAMES_PROJECT_ID,
  MOCK_WIREFRAMES_RUN_DELAY_MS,
} from "./constants";

export { createMockWireframesArtifact, mockWireframesArtifact } from "./wireframesArtifact";
export {
  FIGMA_SYMBOL_URL,
  MOCK_BRAND_KIT,
  MOCK_WIREFRAMES_GENERATED_AT_LABEL,
  MOCK_WIREFRAMES_PROJECT_ID,
  MOCK_WIREFRAMES_RUN_DELAY_MS,
  WIREFRAMES_RESULTS_PREVIEW_LIMIT,
  WIREFRAMES_STATS,
} from "./constants";

/** Simulate backend wireframes in dev until Convex returns a saved artifact. */
export const USE_MOCK_WIREFRAMES_DATA = import.meta.env.DEV;

const MOCK_WIREFRAMES_STORAGE_PREFIX = "stage:mock-wireframes-artifact:";

export function buildWireframesArtifactRecord(
  projectId: string,
  artifact: WireframesArtifact,
  id = `mock-wireframes-${projectId}`,
): WireframesArtifactRecord {
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
    tabData: mapWireframesArtifactToTabData(artifact),
  };
}

export function getMockWireframesArtifact(projectId: string): WireframesArtifact {
  return projectId === MOCK_WIREFRAMES_PROJECT_ID
    ? mockWireframesArtifact
    : createMockWireframesArtifact(projectId);
}

export function getMockWireframesArtifactRecord(projectId: string): WireframesArtifactRecord {
  return buildWireframesArtifactRecord(projectId, getMockWireframesArtifact(projectId));
}

export function loadMockWireframesArtifactRecord(projectId: string): WireframesArtifactRecord | null {
  if (!USE_MOCK_WIREFRAMES_DATA) {
    return null;
  }

  try {
    const raw = sessionStorage.getItem(`${MOCK_WIREFRAMES_STORAGE_PREFIX}${projectId}`);
    if (!raw) {
      return null;
    }

    const artifact = wireframesArtifactSchema.parse(JSON.parse(raw) as unknown);
    return buildWireframesArtifactRecord(projectId, artifact);
  } catch {
    return null;
  }
}

export function saveMockWireframesArtifactRecord(projectId: string, record: WireframesArtifactRecord) {
  if (!USE_MOCK_WIREFRAMES_DATA) {
    return;
  }

  sessionStorage.setItem(`${MOCK_WIREFRAMES_STORAGE_PREFIX}${projectId}`, JSON.stringify(record.artifact));
}

export function clearMockWireframesArtifactRecord(projectId: string) {
  sessionStorage.removeItem(`${MOCK_WIREFRAMES_STORAGE_PREFIX}${projectId}`);
}

export function buildWireframesArtifactFromSelection(input: {
  projectId: string;
  wireframeKind: WireframeKind;
  brandSource: WireframeBrandSource | null;
  screens: ScreenItem[];
}): WireframesArtifact {
  const base = getMockWireframesArtifact(input.projectId);

  return wireframesArtifactSchema.parse({
    ...base,
    wireframeKind: input.wireframeKind,
    brandSource: input.brandSource ?? undefined,
    configureScreens: input.screens.map((screen) => ({
      id: screen.id,
      title: screen.title,
      description: screen.description,
      kind: screen.kind,
      priority: screen.priority,
      required: screen.required,
      selected: screen.selected,
    })),
    generatedScreens: input.screens
      .filter((screen) => screen.selected)
      .map((screen) => ({
        id: screen.id,
        title: screen.title,
        priority: screen.priority,
        generatedAtLabel: base.generatedAtLabel,
      })),
  });
}

export { delay } from "@/mock/project/research";
