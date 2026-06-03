import { useCallback, useState } from "react";
import { useMutation } from "convex/react";
import type { Id } from "@stage/data-ops/convex/data-model";
import { api } from "@/lib/convexApi";
import { clearLocalDownstreamWork } from "@/lib/project/projectDownstreamWork";
import { clearUpstreamStale } from "@/lib/project/upstreamStaleFlag";

export function useClearDownstreamArtifacts(projectId: string) {
  const clearDownstreamMutation = useMutation(api.projectAi.clearDownstreamArtifacts);
  const [isPending, setIsPending] = useState(false);

  const mutateAsync = useCallback(async () => {
    setIsPending(true);
    try {
      await clearDownstreamMutation({ projectId: projectId as Id<"projects"> });
      clearLocalDownstreamWork(projectId);
      clearUpstreamStale(projectId);
    } finally {
      setIsPending(false);
    }
  }, [clearDownstreamMutation, projectId]);

  return { mutateAsync, isPending };
}
