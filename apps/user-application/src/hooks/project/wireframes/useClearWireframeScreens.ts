import { useCallback, useState } from "react";
import { useMutation } from "convex/react";
import type { Id } from "@stage/data-ops/convex/data-model";
import { api } from "@/lib/convexApi";

/**
 * Drops every generated screen and returns the project to Lo-Fi, keeping the curated
 * screen list.
 *
 * A first Hi-Fi generation and a regeneration take different paths — a regeneration merges
 * into the existing artifact, a first run has nothing to merge into — so testing the
 * first-run path used to mean creating a new project every time.
 */
export function useClearWireframeScreens(projectId: string) {
  const clearWireframeScreens = useMutation(api.projectAi.clearWireframeScreens);
  const [isClearing, setIsClearing] = useState(false);

  const clearScreens = useCallback(
    async (screenIds?: string[]) => {
      setIsClearing(true);
      try {
        return await clearWireframeScreens({
          projectId: projectId as Id<"projects">,
          ...(screenIds && screenIds.length > 0 ? { screenIds } : {}),
        });
      } finally {
        setIsClearing(false);
      }
    },
    [clearWireframeScreens, projectId],
  );

  return { clearScreens, isClearing };
}
