import { useMemo } from "react";
import { useQuery } from "convex/react";
import type { Id } from "@stage/data-ops/convex/data-model";
import { useDesktopAuth } from "@/lib/auth";
import { api } from "@/lib/convexApi";
import { useProviderRun } from "@/hooks/engine/useProviderRun";

/** Research run in progress — shared across tabs via Convex + scoped engine run. */
export function useProjectResearchRun(projectId: string) {
  const { isAuthenticated } = useDesktopAuth();
  const providerRun = useProviderRun({ projectId, mode: "research" });
  const runs = useQuery(
    api.projectAi.listRuns,
    isAuthenticated && projectId
      ? { projectId: projectId as Id<"projects">, module: "research" }
      : "skip",
  );

  const convexResearchRunning = useMemo(
    () => runs?.some((run) => run.status === "running") ?? false,
    [runs],
  );

  const isReplacingResearch =
    providerRun.isRunActive || providerRun.isStarting || convexResearchRunning;

  return {
    isReplacingResearch,
    isStarting: providerRun.isStarting,
  };
}
