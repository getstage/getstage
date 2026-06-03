import { useMutation } from "convex/react";
import { api } from "@/lib/convexApi";

export function useClearResearchAndStrategyForRerun(_projectId: string) {
  return useMutation(api.projectAi.clearResearchAndStrategyForRerun);
}
