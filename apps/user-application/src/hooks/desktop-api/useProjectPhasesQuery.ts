import { useQuery } from "@tanstack/react-query";
import { phaseSummarySchema, type PhaseSummary } from "@stage/data-ops";
import { z } from "zod";
import { useDesktopBridge } from "../useDesktopBridge";

const phaseListSchema = z.array(phaseSummarySchema);

export function useProjectPhasesQuery(projectId: string | undefined) {
  const desktop = useDesktopBridge();
  return useQuery<PhaseSummary[]>({
    queryKey: ["desktop", "api", "project", projectId, "phases"],
    enabled: Boolean(projectId),
    queryFn: async () => {
      if (!projectId) {
        throw new Error("Missing project id.");
      }
      return phaseListSchema.parse(await desktop.api.listProjectPhases(projectId));
    },
    retry: 1,
  });
}
