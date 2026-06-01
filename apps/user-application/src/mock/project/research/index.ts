import type { ResearchArtifact } from "@stage/data-ops/contracts";
import { researchArtifactSchema } from "@stage/data-ops/contracts";
import { mapResearchArtifactToTabData } from "@/lib/project/mapResearchArtifactToTabData";
import type { ResearchArtifactRecord } from "@/types/project/researchArtifactRecord";
import { createMockResearchArtifact, mockResearchArtifact, MOCK_RESEARCH_PROJECT_ID } from "./researchArtifact";

export { referoProviderMark, uiPatternExampleImages } from "./assets";
export { createMockResearchArtifact, mockResearchArtifact, MOCK_RESEARCH_PROJECT_ID };

const MOCK_RESEARCH_STORAGE_PREFIX = "stage:mock-research-artifact:";

export function buildResearchArtifactRecord(
  projectId: string,
  artifact: ResearchArtifact,
  id = `mock-research-${projectId}`,
): ResearchArtifactRecord {
  return {
    id,
    projectId,
    runId: null,
    title: artifact.title,
    summary: artifact.summary.join(" "),
    status: "ready",
    createdAt: artifact.generatedAt,
    updatedAt: artifact.generatedAt,
    artifact,
    tabData: mapResearchArtifactToTabData(artifact),
  };
}

export function getMockResearchArtifact(projectId: string): ResearchArtifact {
  return projectId === MOCK_RESEARCH_PROJECT_ID
    ? mockResearchArtifact
    : createMockResearchArtifact(projectId);
}

export function getMockResearchArtifactRecord(projectId: string): ResearchArtifactRecord {
  return buildResearchArtifactRecord(projectId, getMockResearchArtifact(projectId));
}

export function loadMockResearchArtifactRecord(projectId: string): ResearchArtifactRecord | null {
  try {
    const raw = sessionStorage.getItem(`${MOCK_RESEARCH_STORAGE_PREFIX}${projectId}`);
    if (!raw) {
      return null;
    }

    const artifact = researchArtifactSchema.parse(JSON.parse(raw) as unknown);
    return buildResearchArtifactRecord(projectId, artifact);
  } catch {
    return null;
  }
}

export function saveMockResearchArtifactRecord(projectId: string, record: ResearchArtifactRecord) {
  sessionStorage.setItem(
    `${MOCK_RESEARCH_STORAGE_PREFIX}${projectId}`,
    JSON.stringify(record.artifact),
  );
}

export function clearMockResearchArtifactRecord(projectId: string) {
  sessionStorage.removeItem(`${MOCK_RESEARCH_STORAGE_PREFIX}${projectId}`);
}

export function delay(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}
