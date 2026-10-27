import { useEffect } from "react";
import type { RunEvent } from "@stage/data-ops/contracts";
import { useQueryClient } from "@tanstack/react-query";
import { engineQueryKeys } from "@/hooks/engine/queryKeys";
import { useDesktopBridge } from "@/hooks/useDesktopBridge";
import { captureRunEvent } from "@/lib/analytics";

/**
 * Single app-level subscription for engine run events.
 * Appends events to TanStack Query cache — no component useState.
 */
export function useProviderRunInvalidation() {
  const desktop = useDesktopBridge();
  const queryClient = useQueryClient();

  useEffect(() => {
    return desktop.engine.onRunEvent((event) => {
      captureRunEvent(event);
      queryClient.setQueryData<RunEvent[]>(
        engineQueryKeys.runEvents(event.runId),
        (current = []) => [...current, event],
      );
    });
  }, [desktop.engine, queryClient]);
}
