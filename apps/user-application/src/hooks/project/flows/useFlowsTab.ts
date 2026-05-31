import { useEffect, useState } from "react";
import {
  getMockFlowsArtifactRecord,
  loadMockFlowsArtifactRecord,
  saveMockFlowsArtifactRecord,
} from "@/mock/project/flows";
import type { Project } from "@/models/project/project";
import type { FlowsArtifactRecord } from "@/types/project/flowsArtifactRecord";
import { useFlowsArtifact } from "./useFlowsArtifact";

export function useFlowsTab(project: Pick<Project, "id" | "name">) {
  const projectId = project.id;
  const flowsArtifact = useFlowsArtifact(projectId);
  const [mockRecord, setMockRecord] = useState<FlowsArtifactRecord | null>(() =>
    loadMockFlowsArtifactRecord(projectId),
  );

  useEffect(() => {
    setMockRecord(loadMockFlowsArtifactRecord(projectId));
  }, [projectId]);

  const backendData = flowsArtifact.data;
  const data = backendData ?? mockRecord;

  return {
    data,
    isLoading: flowsArtifact.isLoading,
    hasArtifact: data !== null,
    parseError: flowsArtifact.parseError,
    usingMockData: backendData === null && mockRecord !== null,
    saveMockRecord: (record: FlowsArtifactRecord) => {
      setMockRecord(record);
      saveMockFlowsArtifactRecord(projectId, record);
    },
    seedMockRecord: () => {
      const record = getMockFlowsArtifactRecord(projectId);
      setMockRecord(record);
      saveMockFlowsArtifactRecord(projectId, record);
      return record;
    },
  };
}
