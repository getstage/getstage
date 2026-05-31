export const MOCK_FLOWS_PROJECT_ID = "mock-stellar-site";

export const MOCK_FLOWS_GENERATED_AT = Date.parse("2025-04-07T10:00:00.000Z");

export const FLOW_CATEGORY_OPTIONS = [
  "Onboarding",
  "Conversion",
  "Evaluation",
  "Review",
  "Handoff",
  "Client portal",
  "Custom",
] as const;

export const ADD_FLOW_DEFAULT_DRAFT = {
  title: "Baseframe",
  description: "",
  category: "",
  steps: [] as string[],
};

export function buildFlowSteps(labels: readonly string[]) {
  return labels.map((label, index) => ({
    id: `step-${index + 1}`,
    order: index + 1,
    label,
  }));
}
