export type FlowPanelTab = "flows" | "screens";
export type AddFlowStep = "details" | "steps";

export const EMPTY_ADD_FLOW = {
  title: "Baseframe",
  description: "",
  category: "",
  steps: [] as string[],
};

export type AddFlowDraft = typeof EMPTY_ADD_FLOW;
