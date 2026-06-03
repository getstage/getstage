export const engineQueryKeys = {
  all: ["desktop", "engine"] as const,
  providers: () => [...engineQueryKeys.all, "providers"] as const,
  runEvents: (runId: string) => [...engineQueryKeys.all, "runs", runId, "events"] as const,
  activeProviderRun: (projectId: string, mode: string) =>
    [...engineQueryKeys.all, "active-run", projectId, mode] as const,
};
