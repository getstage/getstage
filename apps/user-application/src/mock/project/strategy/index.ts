import { strategyArtifactSchema, type StrategyArtifact } from "@stage/data-ops/contracts";
import { mapStrategyArtifactToTabData } from "@/lib/project/mapStrategyArtifactToTabData";
import type { StrategyArtifactRecord } from "@/types/project/strategyArtifactRecord";
import { delay } from "@/mock/project/research";
import {
  createMockStrategyArtifact,
  mockStrategyArtifact,
  MOCK_STRATEGY_PROJECT_ID,
} from "./strategyArtifact";

export { createMockStrategyArtifact, mockStrategyArtifact, MOCK_STRATEGY_PROJECT_ID };

/** Layout-only mock; set VITE_MOCK_STRATEGY=1 in .env — never used on the default generate path. */
export const USE_MOCK_STRATEGY_DATA = import.meta.env.VITE_MOCK_STRATEGY === "1";

export const MOCK_STRATEGY_RUN_DELAY_MS = 1800;

const MOCK_STRATEGY_STORAGE_PREFIX = "stage:mock-strategy-artifact:";

export function buildStrategyArtifactRecord(
  projectId: string,
  artifact: StrategyArtifact,
  id = `mock-strategy-${projectId}`,
): StrategyArtifactRecord {
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
    tabData: mapStrategyArtifactToTabData(artifact),
  };
}

export function getMockStrategyArtifact(
  projectId: string,
  researchArtifactId?: string | null,
): StrategyArtifact {
  if (projectId === MOCK_STRATEGY_PROJECT_ID && !researchArtifactId) {
    return mockStrategyArtifact;
  }

  return createMockStrategyArtifact(projectId, researchArtifactId ?? undefined);
}

export function getMockStrategyArtifactRecord(
  projectId: string,
  researchArtifactId?: string | null,
): StrategyArtifactRecord {
  return buildStrategyArtifactRecord(
    projectId,
    getMockStrategyArtifact(projectId, researchArtifactId),
  );
}

export function loadMockStrategyArtifactRecord(projectId: string): StrategyArtifactRecord | null {
  if (!USE_MOCK_STRATEGY_DATA) {
    return null;
  }

  try {
    const raw = sessionStorage.getItem(`${MOCK_STRATEGY_STORAGE_PREFIX}${projectId}`);
    if (!raw) {
      return null;
    }

    const artifact = strategyArtifactSchema.parse(JSON.parse(raw) as unknown);
    return buildStrategyArtifactRecord(projectId, artifact);
  } catch {
    return null;
  }
}

export function saveMockStrategyArtifactRecord(projectId: string, record: StrategyArtifactRecord) {
  if (!USE_MOCK_STRATEGY_DATA) {
    return;
  }

  sessionStorage.setItem(
    `${MOCK_STRATEGY_STORAGE_PREFIX}${projectId}`,
    JSON.stringify(record.artifact),
  );
}

export function clearMockStrategyArtifactRecord(projectId: string) {
  sessionStorage.removeItem(`${MOCK_STRATEGY_STORAGE_PREFIX}${projectId}`);
}

export { delay };
