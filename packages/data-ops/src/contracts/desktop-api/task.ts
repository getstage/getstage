import { z } from "zod";

export const taskPrioritySchema = z.enum(["low", "medium", "high"]);

export const taskAssigneeSchema = z.object({
  userId: z.string().min(1),
  name: z.string().nullable(),
});

export const taskSummarySchema = z.object({
  id: z.string().min(1),
  phaseId: z.string().min(1),
  projectId: z.string().min(1),
  title: z.string().min(1),
  isCompleted: z.boolean(),
  dueDate: z.number().int().nonnegative().optional(),
  assigneeIds: z.array(z.string()).default([]),
  assignees: z.array(taskAssigneeSchema).default([]),
  attachmentCount: z.number().int().nonnegative(),
  hasContent: z.boolean(),
  priority: taskPrioritySchema.nullable(),
  order: z.number().int().nonnegative(),
  createdAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative(),
});

export type TaskPriority = z.infer<typeof taskPrioritySchema>;
export type TaskAssignee = z.infer<typeof taskAssigneeSchema>;
export type TaskSummary = z.infer<typeof taskSummarySchema>;
