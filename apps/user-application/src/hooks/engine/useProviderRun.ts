import { useCallback } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { RunEvent, StartRunRequest } from "@stage/data-ops/contracts";
import { engineQueryKeys } from "./queryKeys";
import { useDesktopBridge } from "../useDesktopBridge";

export function useProviderRunEvents(runId: string | null) {
  return useQuery({
    queryKey: engineQueryKeys.runEvents(runId ?? ""),
    queryFn: (): RunEvent[] => [],
    enabled: Boolean(runId),
    staleTime: Number.POSITIVE_INFINITY,
  });
}

export function useProviderRun() {
  const desktop = useDesktopBridge();

  const startRun = useMutation({
    mutationFn: (request: StartRunRequest) => desktop.engine.startRun(request),
  });

  const cancelRun = useMutation({
    mutationFn: (runId: string) => desktop.engine.cancelRun(runId),
  });

  const resetActiveRun = useCallback(() => {
    startRun.reset();
  }, [startRun]);

  const activeRunId = startRun.data?.runId ?? null;
  const activeRunEventsQuery = useProviderRunEvents(activeRunId);

  return {
    startRun,
    cancelRun,
    resetActiveRun,
    activeRunId,
    activeRunEvents: activeRunEventsQuery.data ?? [],
  };
}
