import { useProviderRun } from "@/hooks/engine/useProviderRun";

/** Research run in progress for this desktop session. */
export function useProjectResearchRun(projectId: string) {
  const providerRun = useProviderRun({ projectId, mode: "research" });

  const isReplacingResearch = providerRun.isRunActive || providerRun.isStarting;

  return {
    isReplacingResearch,
    isStarting: providerRun.isStarting,
  };
}
