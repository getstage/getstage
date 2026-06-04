import { useCallback } from "react";
import type { ProviderId } from "@stage/data-ops/contracts";
import { useFlowsRun } from "./useFlowsRun";

export function useFlowsScreenRegenerate(projectId: string) {
  const flowsRun = useFlowsRun(projectId);

  const regenerateScreen = useCallback(
    async (screenId: string, providerId: ProviderId) => {
      await flowsRun.startFlows(providerId, `screen:${screenId}`);
    },
    [flowsRun],
  );

  const regenerateFlow = useCallback(
    async (flowId: string, providerId: ProviderId) => {
      await flowsRun.startFlows(providerId, `flow:${flowId}`);
    },
    [flowsRun],
  );

  return {
    regenerateScreen,
    regenerateFlow,
    isRunning: flowsRun.isRunning || flowsRun.isStarting,
    error: flowsRun.error,
  };
}
