import { z } from "zod";

// A project phase and its tasks, as the task board shows them.
export const taskSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string().optional(),
  summary: z.string().optional(),
  hasContent: z.boolean().optional(),
  status: z.enum(["backlog", "todo", "in-progress", "done", "revision"]).optional(),
  boardStatus: z.enum(["backlog", "todo", "in-progress", "done", "revision"]).optional(),
  revisionNote: z.string().optional(),
  isCompleted: z.boolean(),
  updatedAt: z.number(),
  assignees: z.array(z.object({ name: z.string() })).optional(),
});

export const phaseSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(["upcoming", "active", "completed"]),
  tasks: z.array(taskSchema),
});

export type Task = z.infer<typeof taskSchema>;
export type Phase = z.infer<typeof phaseSchema>;
