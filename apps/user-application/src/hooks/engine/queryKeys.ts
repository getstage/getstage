export const engineQueryKeys = {
  all: ["desktop", "engine"] as const,
  providers: () => [...engineQueryKeys.all, "providers"] as const,
  runEvents: (runId: string) => [...engineQueryKeys.all, "runs", runId, "events"] as const,
};
