import { clearMockFlowsArtifactRecord, loadMockFlowsArtifactRecord } from "@/mock/project/flows";
import { clearMockMoodboardArtifactRecord, loadMockMoodboardArtifactRecord } from "@/mock/project/moodboard";
import { clearMockWireframesArtifactRecord, loadMockWireframesArtifactRecord } from "@/mock/project/wireframes";

export type DownstreamWorkSnapshot = {
  hasConvexMoodboard: boolean;
  hasConvexFlows: boolean;
  hasConvexWireframes: boolean;
  hasMockMoodboard: boolean;
  hasMockFlows: boolean;
  hasMockWireframes: boolean;
};

export function snapshotDownstreamWork(
  projectId: string,
  convex: {
    moodboard: boolean;
    flows: boolean;
    wireframes: boolean;
  },
): DownstreamWorkSnapshot {
  return {
    hasConvexMoodboard: convex.moodboard,
    hasConvexFlows: convex.flows,
    hasConvexWireframes: convex.wireframes,
    hasMockMoodboard: loadMockMoodboardArtifactRecord(projectId) !== null,
    hasMockFlows: loadMockFlowsArtifactRecord(projectId) !== null,
    hasMockWireframes: loadMockWireframesArtifactRecord(projectId) !== null,
  };
}

export function downstreamWorkExists(snapshot: DownstreamWorkSnapshot) {
  return (
    snapshot.hasConvexMoodboard ||
    snapshot.hasConvexFlows ||
    snapshot.hasConvexWireframes ||
    snapshot.hasMockMoodboard ||
    snapshot.hasMockFlows ||
    snapshot.hasMockWireframes
  );
}

export function clearLocalDownstreamWork(projectId: string) {
  clearMockMoodboardArtifactRecord(projectId);
  clearMockFlowsArtifactRecord(projectId);
  clearMockWireframesArtifactRecord(projectId);
}
