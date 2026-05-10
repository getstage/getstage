import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  taskSummarySchema,
  type TaskPriority,
  type TaskSummary,
} from "@stage/data-ops";
import { useDesktopBridge } from "../useDesktopBridge";

const TASKS_API_KEY = ["desktop", "api"] as const;

function invalidateTasks(queryClient: ReturnType<typeof useQueryClient>) {
  // The user-tasks list is the kanban source. The per-phase tasks list and
  // project-detail aggregate query also surface task data, so invalidate the
  // entire desktop API namespace; matches the pattern used elsewhere in the app.
  void queryClient.invalidateQueries({ queryKey: TASKS_API_KEY });
}

export type CreateTaskInput = {
  projectId: string;
  title: string;
  priority?: TaskPriority;
  content?: string;
};

export function useCreateTaskMutation() {
  const desktop = useDesktopBridge();
  const queryClient = useQueryClient();

  return useMutation<TaskSummary, Error, CreateTaskInput>({
    mutationFn: async (input) =>
      taskSummarySchema.parse(await desktop.api.createTask(input)),
    onSuccess: () => invalidateTasks(queryClient),
  });
}

export function useDeleteTaskMutation() {
  const desktop = useDesktopBridge();
  const queryClient = useQueryClient();

  return useMutation<{ ok: true }, Error, string>({
    mutationFn: (taskId) => desktop.api.deleteTask(taskId),
    onSuccess: () => invalidateTasks(queryClient),
  });
}

export type SetTaskPriorityInput = {
  taskId: string;
  priority: TaskPriority | null;
};

export function useSetTaskPriorityMutation() {
  const desktop = useDesktopBridge();
  const queryClient = useQueryClient();

  return useMutation<TaskSummary, Error, SetTaskPriorityInput>({
    mutationFn: async (input) =>
      taskSummarySchema.parse(await desktop.api.setTaskPriority(input)),
    onSuccess: () => invalidateTasks(queryClient),
  });
}
