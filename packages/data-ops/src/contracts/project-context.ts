import { z } from "zod";

export const projectContextTaskSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  phaseName: z.string().min(1).optional(),
  status: z.enum(["todo", "in_progress", "done", "revision", "unknown"]),
  description: z.string().optional(),
  updatedAt: z.number().int().nonnegative().optional(),
});

export const projectContextAssetSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  kind: z.enum(["image", "document", "figma", "url", "other"]),
  url: z.string().url().optional(),
  summary: z.string().optional(),
});

export const projectContextSchema = z.object({
  apiVersion: z.literal("v1"),
  projectId: z.string().min(1),
  projectName: z.string().min(1),
  clientName: z.string().optional(),
  brief: z.string().optional(),
  strategy: z.string().optional(),
  visualDirection: z.string().optional(),
  currentPhase: z.string().optional(),
  tasks: z.array(projectContextTaskSchema).default([]),
  assets: z.array(projectContextAssetSchema).default([]),
  updatedAt: z.number().int().nonnegative(),
});

export type ProjectContextTask = z.infer<typeof projectContextTaskSchema>;
export type ProjectContextAsset = z.infer<typeof projectContextAssetSchema>;
export type ProjectContext = z.infer<typeof projectContextSchema>;
