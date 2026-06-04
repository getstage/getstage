import { useCallback, useState } from "react";
import { useMutation } from "convex/react";
import type { Id } from "@stage/data-ops/convex/data-model";
import { api } from "@/lib/convexApi";

/**
 * Clears research + strategy ahead of a research re-run, exposing an `isPending`
 * flag so the tab can show a busy state while the mutation is in flight.
 */
export function useClearResearchAndStrategyForRerun(_projectId: string) {
  const clear = useMutation(api.projectAi.clearResearchAndStrategyForRerun);
  const [isPending, setIsPending] = useState(false);

  const run = useCallback(
    async (args: { projectId: Id<"projects"> }) => {
      setIsPending(true);
      try {
        return await clear(args);
      } finally {
        setIsPending(false);
      }
    },
    [clear],
  );

  return Object.assign(run, { isPending });
}
