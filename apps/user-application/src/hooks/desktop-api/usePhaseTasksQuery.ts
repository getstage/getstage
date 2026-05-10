import { useQuery } from "@tanstack/react-query";
import { taskSummarySchema, type TaskSummary } from "@stage/data-ops";
import { z } from "zod";
import { useDesktopBridge } from "../useDesktopBridge";

const taskListSchema = z.array(taskSummarySchema);

export function usePhaseTasksQuery(phaseId: string | undefined) {
  const desktop = useDesktopBridge();
  return useQuery<TaskSummary[]>({
    queryKey: ["desktop", "api", "phase", phaseId, "tasks"],
    enabled: Boolean(phaseId),
    queryFn: async () => {
      if (!phaseId) {
        throw new Error("Missing phase id.");
      }
      return taskListSchema.parse(await desktop.api.listPhaseTasks(phaseId));
    },
    retry: 1,
  });
}
