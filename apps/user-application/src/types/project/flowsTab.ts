export type FlowPanelTab = "flows" | "screens";
export type AddFlowStep = "details" | "steps";

export type { FlowsTabData, FlowsTabStats } from "@stage/project-ui/flows/model";

export { ADD_FLOW_DEFAULT_DRAFT as EMPTY_ADD_FLOW } from "@/mock/project/flows/constants";

export type AddFlowDraft = {
  title: string;
  description: string;
  category: string;
  steps: string[];
};
