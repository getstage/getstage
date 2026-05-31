import { moodboardArtifactSchema, type MoodboardArtifact } from "@stage/data-ops/contracts";
import type { ValidatedMoodboardConfigureInput } from "@/lib/project/moodboardConfigureInput";
import { mapMoodboardArtifactToTabData } from "@/lib/project/mapMoodboardArtifactToTabData";
import type { MoodboardArtifactRecord } from "@/types/project/moodboardArtifactRecord";
import { delay } from "@/mock/project/research";
import {
  createMockMoodboardArtifact,
  mockMoodboardArtifact,
} from "./moodboardArtifact";
import { MOCK_MOODBOARD_PROJECT_ID } from "./constants";

export { createMockMoodboardArtifact, mockMoodboardArtifact } from "./moodboardArtifact";
export {
  MOODBOARD_DIRECTION_IDS,
  MOCK_MOODBOARD_PROJECT_ID,
  MOCK_STYLE_GUIDE_ID,
  MOODBOARD_DIRECTION_NAMES,
  MOODBOARD_DIRECTION_REFERENCE_COUNTS,
  getDirectionIdForReferenceIndex,
} from "./constants";
export { defaultStyleGuide } from "./styleGuide";
export {
  moodboardImages,
  moodboardReferenceImages,
} from "./assets";
export {
  createDefaultSelectedReferenceIds,
  createSeedDirections,
  createSeedReferences,
  type MoodboardDirectionFixture,
  type MoodboardFixtureItem,
  type MoodboardMode,
} from "./tabSeed";
export { mockUploadedFiles, getStyleDirectionSummaries, formatUploadedFileSize } from "./constants";

/** Simulate backend moodboard in dev until Convex returns a saved artifact. */
export const USE_MOCK_MOODBOARD_DATA = import.meta.env.DEV;

export const MOCK_MOODBOARD_RUN_DELAY_MS = 2000;
export const MOCK_STYLE_GUIDE_RUN_DELAY_MS = 900;

const MOCK_MOODBOARD_STORAGE_PREFIX = "stage:mock-moodboard-artifact:";

export function buildMoodboardArtifactRecord(
  projectId: string,
  artifact: MoodboardArtifact,
  id = `mock-moodboard-${projectId}`,
): MoodboardArtifactRecord {
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
    tabData: mapMoodboardArtifactToTabData(artifact),
  };
}

export function getMockMoodboardArtifact(
  projectId: string,
  input?: ValidatedMoodboardConfigureInput,
): MoodboardArtifact {
  if (projectId === MOCK_MOODBOARD_PROJECT_ID && !input) {
    return mockMoodboardArtifact;
  }

  return createMockMoodboardArtifact(projectId, input);
}

export function getMockMoodboardArtifactRecord(
  projectId: string,
  input?: ValidatedMoodboardConfigureInput,
): MoodboardArtifactRecord {
  return buildMoodboardArtifactRecord(projectId, getMockMoodboardArtifact(projectId, input));
}

/** Tab data derived from the canonical seed artifact (matches UI initial state). */
export function getSeedMoodboardTabData() {
  return mapMoodboardArtifactToTabData(mockMoodboardArtifact);
}

export function loadMockMoodboardArtifactRecord(projectId: string): MoodboardArtifactRecord | null {
  if (!USE_MOCK_MOODBOARD_DATA) {
    return null;
  }

  try {
    const raw = sessionStorage.getItem(`${MOCK_MOODBOARD_STORAGE_PREFIX}${projectId}`);
    if (!raw) {
      return null;
    }

    const artifact = moodboardArtifactSchema.parse(JSON.parse(raw) as unknown);
    return buildMoodboardArtifactRecord(projectId, artifact);
  } catch {
    return null;
  }
}

export function saveMockMoodboardArtifactRecord(projectId: string, record: MoodboardArtifactRecord) {
  if (!USE_MOCK_MOODBOARD_DATA) {
    return;
  }

  sessionStorage.setItem(
    `${MOCK_MOODBOARD_STORAGE_PREFIX}${projectId}`,
    JSON.stringify(record.artifact),
  );
}

export function clearMockMoodboardArtifactRecord(projectId: string) {
  sessionStorage.removeItem(`${MOCK_MOODBOARD_STORAGE_PREFIX}${projectId}`);
}

export { delay };
