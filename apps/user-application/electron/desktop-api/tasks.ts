import {
  taskPrioritySchema,
  taskSummarySchema,
  type TaskPriority,
  type TaskSummary,
} from "@stage/data-ops";
import { z } from "zod";
import type { DesktopAuthController } from "../auth";
import {
  fetchDesktopApiJson,
  postDesktopApiJson,
  sendDesktopApi,
} from "../helpers/desktop-api";

/**
 * Functions in this file are called from `electron/ipc.ts`, which receives
 * fully untyped payloads from the renderer. Every input arg is therefore
 * declared as `unknown` and parsed with Zod inside the function. No casts.
 * Every API response is parsed with the matching data-ops schema before
 * returning. This keeps the wire boundary honest in both directions.
 */

const tasksResponseSchema = z.object({
  tasks: z.array(taskSummarySchema),
});

const taskResponseSchema = z.object({
  task: taskSummarySchema,
});

const okResponseSchema = z.object({
  ok: z.literal(true),
});

const taskIdSchema = z.string().min(1, "Task id is required");

const phaseIdSchema = z.string().min(1, "Phase id is required");

export async function listPhaseTasks(
  authController: DesktopAuthController,
  rawPhaseId: unknown,
): Promise<TaskSummary[]> {
  const phaseId = phaseIdSchema.parse(rawPhaseId);
  const data = await fetchDesktopApiJson<unknown>({
    authController,
    path: `/phases/${encodeURIComponent(phaseId)}/tasks`,
  });
  return tasksResponseSchema.parse(data).tasks;
}

const userTasksQuerySchema = z.object({
  limit: z.number().int().positive().max(200).optional(),
});
export type ListUserTasksArgs = z.infer<typeof userTasksQuerySchema>;

export async function listUserTasks(
  authController: DesktopAuthController,
  rawArgs: unknown = {},
): Promise<TaskSummary[]> {
  const args = userTasksQuerySchema.parse(rawArgs ?? {});
  const search = new URLSearchParams();
  if (args.limit !== undefined) {
    search.set("limit", String(args.limit));
  }
  const query = search.toString();
  const data = await fetchDesktopApiJson<unknown>({
    authController,
    path: `/me/tasks${query ? `?${query}` : ""}`,
  });
  return tasksResponseSchema.parse(data).tasks;
}

const createTaskArgsSchema = z.object({
  projectId: z.string().min(1, "Project id is required"),
  title: z.string().trim().min(1, "Task title is required"),
  priority: taskPrioritySchema.optional(),
  content: z.string().optional(),
});
export type CreateTaskArgs = z.infer<typeof createTaskArgsSchema>;

export async function createTask(
  authController: DesktopAuthController,
  rawArgs: unknown,
): Promise<TaskSummary> {
  const body = createTaskArgsSchema.parse(rawArgs);
  const data = await postDesktopApiJson<unknown>({
    authController,
    path: "/tasks",
    body,
  });
  return taskResponseSchema.parse(data).task;
}

const setTaskPriorityArgsSchema = z.object({
  taskId: taskIdSchema,
  priority: taskPrioritySchema.nullable(),
});
export type SetTaskPriorityArgs = z.infer<typeof setTaskPriorityArgsSchema>;

export async function setTaskPriority(
  authController: DesktopAuthController,
  rawArgs: unknown,
): Promise<TaskSummary> {
  const args = setTaskPriorityArgsSchema.parse(rawArgs);
  const data = await postDesktopApiJson<unknown>({
    authController,
    path: `/tasks/${encodeURIComponent(args.taskId)}/priority`,
    body: { priority: args.priority },
  });
  return taskResponseSchema.parse(data).task;
}

export async function deleteTask(
  authController: DesktopAuthController,
  rawTaskId: unknown,
): Promise<{ ok: true }> {
  const taskId = taskIdSchema.parse(rawTaskId);
  const data = await sendDesktopApi<unknown>({
    authController,
    method: "DELETE",
    path: `/tasks/${encodeURIComponent(taskId)}`,
  });
  return okResponseSchema.parse(data);
}

// re-exported for renderer-side typing
export type { TaskPriority };
