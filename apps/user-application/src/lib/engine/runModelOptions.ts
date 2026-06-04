import type { RunModelOptionSelection } from "@stage/data-ops/contracts";
import type { ReasoningEffort, ResponseSpeed } from "@/hooks/engine/useChatDefaults";

export function buildRunModelOptions(input: {
  reasoningEffort: ReasoningEffort;
  responseSpeed: ResponseSpeed;
}): RunModelOptionSelection[] {
  return [
    { id: "reasoning_effort", value: input.reasoningEffort },
    { id: "response_speed", value: input.responseSpeed },
  ];
}
