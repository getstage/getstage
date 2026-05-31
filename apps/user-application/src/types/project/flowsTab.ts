export type FlowPanelTab = "flows" | "screens";
export type AddFlowStep = "details" | "steps";

export type FlowsTabStats = {
  approvedFlowCount: number;
  totalFlowCount: number;
  identifiedScreenCount: number;
  uniqueScreenCount: number;
};

export type FlowsTabData = {
  flows: import("@/models/project/project").ProjectFlow[];
  screens: import("@/models/project/project").ProjectScreen[];
  stats: FlowsTabStats;
};

export { ADD_FLOW_DEFAULT_DRAFT as EMPTY_ADD_FLOW } from "@/mock/project/flows/constants";

export type AddFlowDraft = {
  title: string;
  description: string;
  category: string;
  steps: string[];
};
