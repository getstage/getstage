import { useMemo } from "react";
import { useFlowsArtifact } from "./flows/useFlowsArtifact";
import { useMoodboardArtifact } from "./moodboard/useMoodboardArtifact";
import { useWireframesArtifact } from "./wireframes/useWireframesArtifact";
import {
  downstreamWorkExists,
  snapshotDownstreamWork,
  type DownstreamWorkSnapshot,
} from "@/lib/project/projectDownstreamWork";

export function useProjectDownstreamWork(projectId: string) {
  const moodboard = useMoodboardArtifact(projectId);
  const flows = useFlowsArtifact(projectId);
  const wireframes = useWireframesArtifact(projectId);

  const snapshot = useMemo<DownstreamWorkSnapshot>(
    () =>
      snapshotDownstreamWork(projectId, {
        moodboard: moodboard.hasArtifact,
        flows: flows.hasArtifact,
        wireframes: wireframes.hasArtifact,
      }),
    [
      projectId,
      moodboard.hasArtifact,
      flows.hasArtifact,
      wireframes.hasArtifact,
    ],
  );

  return {
    snapshot,
    hasDownstream: downstreamWorkExists(snapshot),
    isLoading: moodboard.isLoading || flows.isLoading || wireframes.isLoading,
  };
}
