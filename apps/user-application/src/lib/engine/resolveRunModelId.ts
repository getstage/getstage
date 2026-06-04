import type { ProviderId } from "@stage/data-ops/contracts";

export function resolveRunModelId(providerId: ProviderId, selectedModelId: string): string {
  if (providerId === "codex") {
    if (selectedModelId === "codex-default" || selectedModelId.startsWith("gpt-")) {
      return selectedModelId === "codex-default" ? "codex-default" : selectedModelId;
    }

    return "codex-default";
  }

  if (selectedModelId.startsWith("claude-")) {
    return selectedModelId;
  }

  return "claude-sonnet-4-6";
}
