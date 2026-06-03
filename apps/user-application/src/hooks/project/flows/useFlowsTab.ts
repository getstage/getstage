import type { Project } from "@/models/project/project";
import { useFlowsArtifact } from "./useFlowsArtifact";

export function useFlowsTab(project: Pick<Project, "id" | "name">) {
  const projectId = project.id;
  const flowsArtifact = useFlowsArtifact(projectId);

  const backendData = flowsArtifact.data;
  const data = backendData;

  return {
    data,
    isLoading: flowsArtifact.isLoading,
    hasArtifact: data !== null,
    parseError: flowsArtifact.parseError,
    usingMockData: false,
  };
}
