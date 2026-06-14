import { z } from "zod";

export const chatProjectReferenceSchema = z.object({
  projectId: z.string().min(1),
  projectName: z.string().min(1),
  clientName: z.string().min(1),
  status: z.enum(["active", "paused", "completed"]),
  updatedAt: z.number().int().nonnegative(),
});

export const chatProjectTaskSchema = z.object({
  id: z.string().min(1),
  phaseId: z.string().min(1),
  phaseName: z.string().min(1),
  title: z.string().min(1),
  status: z.enum(["todo", "in_progress", "done"]),
  summary: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]).nullable(),
  dueDate: z.number().int().nonnegative().optional(),
  updatedAt: z.number().int().nonnegative(),
});

export const chatProjectPhaseSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  status: z.enum(["completed", "active", "upcoming"]),
  progress: z.number(),
  taskCount: z.number().int().nonnegative(),
  includedTaskCount: z.number().int().nonnegative(),
});

export const chatProjectArtifactSchema = z.object({
  id: z.string().min(1),
  module: z.enum(["research", "strategy", "moodboard", "flows", "generate", "delivery"]),
  kind: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().optional(),
  status: z.enum(["draft", "ready", "approved", "superseded", "failed"]),
  excerpt: z.string().optional(),
  updatedAt: z.number().int().nonnegative(),
});

export const chatProjectContextSchema = z.object({
  apiVersion: z.literal("v1"),
  project: chatProjectReferenceSchema.extend({
    type: z.string().min(1),
    progress: z.number(),
    startDate: z.number().int().nonnegative(),
    endDate: z.number().int().nonnegative(),
  }),
  brief: z.string().optional(),
  notes: z.string().optional(),
  phases: z.array(chatProjectPhaseSchema),
  tasks: z.array(chatProjectTaskSchema),
  artifacts: z.array(chatProjectArtifactSchema),
  omitted: z.object({
    phases: z.number().int().nonnegative(),
    tasks: z.number().int().nonnegative(),
    artifacts: z.number().int().nonnegative(),
  }),
  updatedAt: z.number().int().nonnegative(),
});

export type ChatProjectReference = z.infer<typeof chatProjectReferenceSchema>;
export type ChatProjectContext = z.infer<typeof chatProjectContextSchema>;
