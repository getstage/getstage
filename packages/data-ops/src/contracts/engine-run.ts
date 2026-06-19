import { z } from "zod";

import {
  engineApiVersionSchema,
  engineErrorSchema,
  providerIdSchema,
  providerOptionChoiceSchema,
} from "./engine-provider";

export const runModeSchema = z.enum([
  "chat",
  "voice",
  "research",
  "strategy",
  "moodboard",
  "flows",
  "generation",
  "wireframes",
  "critique",
  "styleguide",
]);

export const runStatusSchema = z.enum([
  "accepted",
  "started",
  "running",
  "completed",
  "failed",
  "cancelled",
]);

export const runContextSchema = z.object({
  projectId: z.string().min(1).optional(),
  directionId: z.string().min(1).optional(),
  phaseId: z.string().min(1).optional(),
  taskId: z.string().min(1).optional(),
  source: z.string().min(1).optional(),
});

export const runModelOptionSelectionSchema = z.object({
  id: z.string().min(1),
  value: z.union([z.string().min(1), z.boolean()]),
});

export const startRunRequestSchema = z.object({
  providerId: providerIdSchema,
  modelId: z.string().min(1),
  modelOptions: z.array(runModelOptionSelectionSchema).default([]),
  workingDirectory: z.string().min(1).optional(),
  prompt: z.string().min(1),
  mode: runModeSchema,
  context: runContextSchema.default({}),
  attachments: z.array(z.object({
    id: z.string().min(1),
    kind: z.enum(["image", "document", "figma", "url", "audio", "other"]),
    name: z.string().min(1).optional(),
    url: z.string().url().optional(),
    mimeType: z.string().min(1).optional(),
    localPath: z.string().min(1).optional(),
  })).default([]),
});

export const startRunResponseSchema = z.object({
  apiVersion: engineApiVersionSchema,
  runId: z.string().min(1),
  status: z.literal("started"),
});

export const runEventBaseSchema = z.object({
  apiVersion: engineApiVersionSchema,
  runId: z.string().min(1),
  providerId: providerIdSchema,
  createdAt: z.number().int().nonnegative(),
});

export const runEventSchema = z.discriminatedUnion("type", [
  runEventBaseSchema.extend({
    type: z.literal("run_started"),
    modelId: z.string().min(1),
    mode: runModeSchema,
  }),
  runEventBaseSchema.extend({
    type: z.literal("output_delta"),
    text: z.string(),
  }),
  runEventBaseSchema.extend({
    type: z.literal("tool_call_started"),
    toolCallId: z.string().min(1),
    label: z.string().min(1),
  }),
  runEventBaseSchema.extend({
    type: z.literal("tool_call_delta"),
    toolCallId: z.string().min(1),
    text: z.string(),
  }),
  runEventBaseSchema.extend({
    type: z.literal("tool_call_completed"),
    toolCallId: z.string().min(1),
    status: z.enum(["completed", "failed"]),
  }),
  runEventBaseSchema.extend({
    type: z.literal("file_reference"),
    path: z.string().min(1),
    line: z.number().int().positive().optional(),
  }),
  runEventBaseSchema.extend({
    type: z.literal("provider_warning"),
    message: z.string(),
  }),
  runEventBaseSchema.extend({
    type: z.literal("model_rerouted"),
    fromModelId: z.string().min(1),
    toModelId: z.string().min(1),
    reason: z.string().min(1).optional(),
  }),
  runEventBaseSchema.extend({
    type: z.literal("model_options"),
    options: z.array(providerOptionChoiceSchema),
  }),
  runEventBaseSchema.extend({
    type: z.literal("run_completed"),
    finalText: z.string().optional(),
  }),
  runEventBaseSchema.extend({
    type: z.literal("run_failed"),
    error: engineErrorSchema,
  }),
  runEventBaseSchema.extend({
    type: z.literal("run_cancelled"),
    reason: z.string().min(1).optional(),
  }),
]);

export const cancelRunResponseSchema = z.object({
  apiVersion: engineApiVersionSchema,
  runId: z.string().min(1),
  status: z.literal("cancelled"),
});

export type RunMode = z.infer<typeof runModeSchema>;
export type RunStatus = z.infer<typeof runStatusSchema>;
export type RunContext = z.infer<typeof runContextSchema>;
export type RunModelOptionSelection = z.infer<typeof runModelOptionSelectionSchema>;
export type StartRunRequest = z.infer<typeof startRunRequestSchema>;
export type StartRunResponse = z.infer<typeof startRunResponseSchema>;
export type RunEventBase = z.infer<typeof runEventBaseSchema>;
export type RunEvent = z.infer<typeof runEventSchema>;
export type CancelRunResponse = z.infer<typeof cancelRunResponseSchema>;
