import { z } from "zod";

export const engineEventTypeSchema = z.enum([
  "engine.ready",
  "engine.error",
  "provider.detected",
  "provider.unavailable",
  "job.accepted",
  "job.progress",
  "job.token",
  "job.completed",
  "job.failed",
  "job.cancelled",
  "context.scanStarted",
  "context.fileDiscovered",
  "context.scanCompleted",
  "critique.started",
  "critique.completed",
  "voice.listening",
  "voice.transcriptPartial",
  "voice.transcriptFinal",
]);

export const engineEventSchema = z.object({
  apiVersion: z.literal("v1"),
  id: z.string().min(1),
  commandId: z.string().min(1).optional(),
  jobId: z.string().min(1).optional(),
  type: engineEventTypeSchema,
  payload: z.unknown(),
  createdAt: z.number().int().nonnegative(),
});

export type EngineEventType = z.infer<typeof engineEventTypeSchema>;
export type EngineEvent = z.infer<typeof engineEventSchema>;
