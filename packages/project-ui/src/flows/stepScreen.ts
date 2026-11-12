import type { FlowStep, Screen } from "@stage/data-ops/contracts";

// Generated step labels read "Screen → action".
export function stepScreenTitle(label: string) {
  const [title = ""] = label.split(/\s*(?:→|->)\s*/, 1);
  return title.trim();
}

// Steps the model left without a screenId still belong to the screen named before "→".
export function findStepScreen(step: FlowStep, screens: Screen[]) {
  const title = stepScreenTitle(step.label).toLowerCase();
  return screens.find((screen) => screen.id === step.screenId) ?? screens.find((screen) => screen.title.trim().toLowerCase() === title);
}
