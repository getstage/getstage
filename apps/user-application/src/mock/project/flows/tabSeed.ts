import type { ProjectFlow, ProjectScreen } from "@/models/project/project";
import { mockFlowsArtifact } from "./flowsArtifact";
import { mapFlowToProjectFlow, mapScreenToProjectScreen } from "@/lib/project/mapFlowsArtifactToTabData";

export function createSeedFlows(): ProjectFlow[] {
  return mockFlowsArtifact.flows.map(mapFlowToProjectFlow);
}

export function createSeedScreens(): ProjectScreen[] {
  return mockFlowsArtifact.screens.map(mapScreenToProjectScreen);
}

export function getDefaultExpandedFlowId(flows: ProjectFlow[]): string | null {
  return flows[0]?.id ?? null;
}
