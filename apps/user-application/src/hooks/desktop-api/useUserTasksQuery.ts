import { useQuery } from "@tanstack/react-query";
import { taskSummarySchema, type TaskSummary } from "@stage/data-ops";
import { z } from "zod";
import { useDesktopBridge } from "../useDesktopBridge";

const taskListSchema = z.array(taskSummarySchema);

export type UseUserTasksQueryArgs = {
  limit?: number;
};

export function useUserTasksQuery(args: UseUserTasksQueryArgs = {}) {
  const desktop = useDesktopBridge();
  const { limit } = args;

  return useQuery<TaskSummary[]>({
    queryKey: ["desktop", "api", "me", "tasks", { limit: limit ?? null }],
    queryFn: async () =>
      taskListSchema.parse(await desktop.api.listUserTasks(limit ? { limit } : undefined)),
    retry: 1,
  });
}
