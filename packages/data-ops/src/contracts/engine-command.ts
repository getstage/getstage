import { z } from "zod";

export const engineCommandTypeSchema = z.enum([
  "engine.ping",
  "provider.detect",
  "provider.startChat",
  "provider.cancelJob",
  "context.scanProject",
  "context.getProjectSummary",
  "critique.start",
  "voice.startListening",
  "voice.stopListening",
  "voice.transcribeCloud",
  "permissions.getStatus",
]);

export const engineCommandSchema = z.object({
  apiVersion: z.literal("v1"),
  id: z.string().min(1),
  type: engineCommandTypeSchema,
  payload: z.unknown(),
  createdAt: z.number().int().nonnegative(),
});

export type EngineCommandType = z.infer<typeof engineCommandTypeSchema>;
export type EngineCommand = z.infer<typeof engineCommandSchema>;
