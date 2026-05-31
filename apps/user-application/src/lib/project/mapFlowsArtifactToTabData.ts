import type { Flow, FlowsArtifact, Screen } from "@stage/data-ops/contracts";
import type { ProjectFlow, ProjectScreen } from "@/models/project/project";
import type { FlowsTabData } from "@/types/project/flowsTab";

export function mapFlowToProjectFlow(flow: Flow): ProjectFlow {
  return {
    id: flow.id,
    title: flow.title,
    description: flow.description,
    status: flow.status,
    screenCount: flow.screenCount,
    category: flow.category,
    steps: flow.steps.map((step) => step.label),
  };
}

export function mapScreenToProjectScreen(screen: Screen): ProjectScreen {
  return {
    id: screen.id,
    title: screen.title,
    description: screen.description,
    flowCount: screen.flowCount,
    keyElements: screen.keyElements,
  };
}

export function computeFlowsTabStats(flows: FlowsTabData["flows"], screens: FlowsTabData["screens"]) {
  const approvedFlowCount = flows.filter((flow) => flow.status.toLowerCase() === "approved").length;

  return {
    approvedFlowCount,
    totalFlowCount: flows.length,
    identifiedScreenCount: flows.reduce((total, flow) => total + (flow.screenCount ?? 0), 0),
    uniqueScreenCount: screens.length,
  };
}

export function mapFlowsArtifactToTabData(artifact: FlowsArtifact): FlowsTabData {
  const flows = artifact.flows.map(mapFlowToProjectFlow);
  const screens = artifact.screens.map(mapScreenToProjectScreen);

  return {
    flows,
    screens,
    stats: computeFlowsTabStats(flows, screens),
  };
}
