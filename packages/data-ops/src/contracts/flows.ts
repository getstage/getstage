import { z } from "zod";

export const flowStatusSchema = z.enum(["Approved", "Draft", "In Review"]);

export const flowStepSchema = z.object({
  id: z.string().min(1),
  order: z.number().int().nonnegative(),
  label: z.string().min(1),
});

export const flowSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  status: flowStatusSchema,
  category: z.string().min(1),
  screenCount: z.number().int().nonnegative(),
  steps: z.array(flowStepSchema).default([]),
});

export const screenSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  flowCount: z.number().int().nonnegative(),
  keyElements: z.array(z.string().min(1)).default([]),
});

export const flowsInputSchema = z.object({
  projectId: z.string().min(1),
  projectName: z.string().min(1),
  strategyArtifactId: z.string().min(1).optional(),
  moodboardArtifactId: z.string().min(1).optional(),
  additionalNotes: z.string().min(1).max(2000).optional(),
});

export const flowsArtifactSchema = z.object({
  apiVersion: z.literal("v1"),
  artifactKind: z.literal("flowsArtifact"),
  projectId: z.string().min(1),
  title: z.string().min(1),
  flows: z.array(flowSchema).default([]),
  screens: z.array(screenSchema).default([]),
  generatedAt: z.number().int().nonnegative(),
});

export type FlowStatus = z.infer<typeof flowStatusSchema>;
export type FlowStep = z.infer<typeof flowStepSchema>;
export type Flow = z.infer<typeof flowSchema>;
export type Screen = z.infer<typeof screenSchema>;
export type FlowsInput = z.infer<typeof flowsInputSchema>;
export type FlowsArtifact = z.infer<typeof flowsArtifactSchema>;
