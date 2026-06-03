import { useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { RunEvent, StartRunRequest } from "@stage/data-ops/contracts";
import { engineQueryKeys } from "./queryKeys";
import { useDesktopBridge } from "../useDesktopBridge";

type ActiveRunSnapshot = { runId: string };

export function useProviderRunEvents(runId: string | null) {
  return useQuery({
    queryKey: engineQueryKeys.runEvents(runId ?? ""),
    queryFn: (): RunEvent[] => [],
    enabled: Boolean(runId),
    staleTime: Number.POSITIVE_INFINITY,
  });
}

type ProviderRunScope = {
  projectId: string;
  mode: string;
};

export function useProviderRun(scope?: ProviderRunScope) {
  const desktop = useDesktopBridge();
  const queryClient = useQueryClient();
  const activeRunKey = scope
    ? engineQueryKeys.activeProviderRun(scope.projectId, scope.mode)
    : null;

  const startRun = useMutation({
    mutationKey: activeRunKey ?? undefined,
    mutationFn: (request: StartRunRequest) => desktop.engine.startRun(request),
    onSuccess: (data, _variables, _context) => {
      if (activeRunKey) {
        queryClient.setQueryData<ActiveRunSnapshot>(activeRunKey, { runId: data.runId });
      }
    },
  });

  const cancelRun = useMutation({
    mutationFn: (runId: string) => desktop.engine.cancelRun(runId),
  });

  const resetActiveRun = useCallback(() => {
    startRun.reset();
    if (activeRunKey) {
      queryClient.removeQueries({ queryKey: activeRunKey });
    }
  }, [activeRunKey, queryClient, startRun]);

  const cachedActiveRun = activeRunKey
    ? queryClient.getQueryData<ActiveRunSnapshot>(activeRunKey)
    : null;

  const activeRunId = startRun.data?.runId ?? cachedActiveRun?.runId ?? null;
  const activeRunEventsQuery = useProviderRunEvents(activeRunId);

  const activeRunEvents = activeRunEventsQuery.data ?? [];
  const hasTerminalEvent = useMemo(
    () =>
      activeRunEvents.some(
        (event) =>
          event.type === "run_completed" ||
          event.type === "run_failed" ||
          event.type === "run_cancelled",
      ),
    [activeRunEvents],
  );

  const isRunActive = useMemo(
    () => activeRunId !== null && !hasTerminalEvent && !startRun.isError,
    [activeRunId, hasTerminalEvent, startRun.isError],
  );

  return {
    startRun,
    cancelRun,
    resetActiveRun,
    activeRunId,
    activeRunEvents,
    hasTerminalEvent,
    isRunActive,
    isStarting: startRun.isPending,
  };
}
