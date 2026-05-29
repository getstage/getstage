import { useMemo } from "react";
import { useQuery } from "convex/react";
import { taskSummarySchema, type TaskSummary } from "@stage/data-ops";
import { z } from "zod";
import { useDesktopAuth } from "@/lib/auth";
import { api } from "@/lib/convexApi";

const taskListSchema = z.array(taskSummarySchema);

export type UseUserTasksQueryArgs = {
  limit?: number;
};

export function useUserTasksQuery(args: UseUserTasksQueryArgs = {}) {
  const { limit } = args;
  const { isAuthenticated, isLoading: isAuthLoading } = useDesktopAuth();
  const tasks = useQuery(api.desktop.listUserTasks, isAuthenticated ? (limit ? { limit } : {}) : "skip");
  const data = useMemo<TaskSummary[] | undefined>(
    () => tasks === undefined ? undefined : taskListSchema.parse(tasks),
    [tasks],
  );

  return {
    data,
    isLoading: isAuthLoading || (isAuthenticated && tasks === undefined),
    error: null,
  };
}
