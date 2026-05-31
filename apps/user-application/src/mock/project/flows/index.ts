import { flowsArtifactSchema, type FlowsArtifact } from "@stage/data-ops/contracts";
import { mapFlowsArtifactToTabData } from "@/lib/project/mapFlowsArtifactToTabData";
import type { FlowsArtifactRecord } from "@/types/project/flowsArtifactRecord";
import { createMockFlowsArtifact, mockFlowsArtifact, MOCK_FLOWS_PROJECT_ID } from "./flowsArtifact";

export { createMockFlowsArtifact, mockFlowsArtifact, MOCK_FLOWS_PROJECT_ID } from "./flowsArtifact";
export {
  ADD_FLOW_DEFAULT_DRAFT,
  FLOW_CATEGORY_OPTIONS,
  buildFlowSteps,
} from "./constants";
export {
  createSeedFlows,
  createSeedScreens,
  getDefaultExpandedFlowId,
} from "./tabSeed";

/** Simulate backend flows in dev until Convex returns a saved artifact. */
export const USE_MOCK_FLOWS_DATA = import.meta.env.DEV;

const MOCK_FLOWS_STORAGE_PREFIX = "stage:mock-flows-artifact:";

export function buildFlowsArtifactRecord(
  projectId: string,
  artifact: FlowsArtifact,
  id = `mock-flows-${projectId}`,
): FlowsArtifactRecord {
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
    tabData: mapFlowsArtifactToTabData(artifact),
  };
}

export function getMockFlowsArtifact(projectId: string): FlowsArtifact {
  return projectId === MOCK_FLOWS_PROJECT_ID ? mockFlowsArtifact : createMockFlowsArtifact(projectId);
}

export function getMockFlowsArtifactRecord(projectId: string): FlowsArtifactRecord {
  return buildFlowsArtifactRecord(projectId, getMockFlowsArtifact(projectId));
}

export function getSeedFlowsTabData() {
  return mapFlowsArtifactToTabData(mockFlowsArtifact);
}

export function loadMockFlowsArtifactRecord(projectId: string): FlowsArtifactRecord | null {
  if (!USE_MOCK_FLOWS_DATA) {
    return null;
  }

  try {
    const raw = sessionStorage.getItem(`${MOCK_FLOWS_STORAGE_PREFIX}${projectId}`);
    if (!raw) {
      return null;
    }

    const artifact = flowsArtifactSchema.parse(JSON.parse(raw) as unknown);
    return buildFlowsArtifactRecord(projectId, artifact);
  } catch {
    return null;
  }
}

export function saveMockFlowsArtifactRecord(projectId: string, record: FlowsArtifactRecord) {
  if (!USE_MOCK_FLOWS_DATA) {
    return;
  }

  sessionStorage.setItem(`${MOCK_FLOWS_STORAGE_PREFIX}${projectId}`, JSON.stringify(record.artifact));
}

export function clearMockFlowsArtifactRecord(projectId: string) {
  sessionStorage.removeItem(`${MOCK_FLOWS_STORAGE_PREFIX}${projectId}`);
}
