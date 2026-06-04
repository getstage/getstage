import { z } from "zod";

export const projectTabSchema = z.enum([
  "overview",
  "research",
  "strategy",
  "flows",
  "moodboard",
  "wireframes",
  "assets",
]);

export const taskSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string().optional(),
  status: z.enum(["backlog", "todo", "in-progress", "done"]).optional(),
  boardStatus: z.enum(["backlog", "todo", "in-progress", "done"]).optional(),
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

export const projectReferenceSchema = z.object({
  id: z.string(),
  title: z.string(),
  source: z.string(),
  date: z.string(),
});

export const projectFlowSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  status: z.string(),
  screenCount: z.number().optional(),
  category: z.string().optional(),
  steps: z.array(z.string()).optional(),
});

export const projectScreenSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  flowCount: z.number(),
  keyElements: z.array(z.string()),
});

export const projectAssetSchema = z.object({
  id: z.string(),
  title: z.string(),
  type: z.string(),
});

export const projectSchema = z.object({
  id: z.string(),
  name: z.string(),
  clientName: z.string(),
  status: z.enum(["active", "paused", "completed"]),
  projectImageUrl: z.string().optional(),
  phases: z.array(phaseSchema),
  research: z.object({
    clientWebsite: z.string(),
    competitors: z.array(z.string()),
    references: z.array(z.string()),
    brief: z.string(),
    notes: z.string(),
  }),
  moodboard: z.object({
    references: z.array(projectReferenceSchema),
  }),
  flows: z.array(projectFlowSchema),
  screens: z.array(projectScreenSchema).optional(),
  assets: z.array(projectAssetSchema),
});

export type ProjectTab = z.infer<typeof projectTabSchema>;
export type Task = z.infer<typeof taskSchema>;
export type Phase = z.infer<typeof phaseSchema>;
export type ProjectReference = z.infer<typeof projectReferenceSchema>;
export type ProjectFlow = z.infer<typeof projectFlowSchema>;
export type ProjectScreen = z.infer<typeof projectScreenSchema>;
export type ProjectAsset = z.infer<typeof projectAssetSchema>;
export type Project = z.infer<typeof projectSchema>;
