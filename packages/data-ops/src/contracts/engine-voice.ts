import { z } from "zod";

import { engineApiVersionSchema, engineErrorSchema } from "./engine-provider";

export const voiceTranscriptionProviderSchema = z.enum([
  "chatgpt-codex-session",
  "openrouter",
  "mistral",
  "openai-audio-api",
]);

export const voiceTranscriptionModelSchema = z.enum([
  "chatgpt-backend-transcribe",
  "mistralai/voxtral-mini-transcribe",
  "voxtral-mini-latest",
  "gpt-4o-transcribe",
  "gpt-4o-mini-transcribe",
]);

export const voiceCaptureModeSchema = z.literal("batch");

export const voiceAudioFormatSchema = z.enum([
  "audio/webm",
  "audio/wav",
  "audio/mpeg",
  "audio/mp4",
  "audio/ogg",
]);

export const voiceTranscriptionStatusSchema = z.enum([
  "queued",
  "uploading",
  "transcribing",
  "completed",
  "failed",
  "cancelled",
]);

export const voiceTranscriptionRequestSchema = z.object({
  apiVersion: engineApiVersionSchema.default("v1"),
  provider: voiceTranscriptionProviderSchema.default("chatgpt-codex-session"),
  model: voiceTranscriptionModelSchema.default("chatgpt-backend-transcribe"),
  mode: voiceCaptureModeSchema.default("batch"),
  audioMimeType: voiceAudioFormatSchema,
  audioBase64: z.string().min(1).optional(),
  audioSizeBytes: z.number().int().positive(),
  sampleRateHz: z.number().int().positive().optional(),
  durationMs: z.number().int().positive().optional(),
  cwd: z.string().min(1).optional(),
  threadId: z.string().min(1).optional(),
  language: z.string().min(2).max(16).optional(),
  prompt: z.string().min(1).optional(),
  context: z.object({
    projectId: z.string().min(1).optional(),
    source: z.enum(["companion", "chat", "research", "generation"]).optional(),
    selectedReasoningProvider: z.enum(["claude", "codex"]).optional(),
  }).default({}),
});

export const voiceTranscriptResponseSchema = z.object({
  apiVersion: engineApiVersionSchema,
  transcriptionId: z.string().min(1),
  provider: voiceTranscriptionProviderSchema,
  model: voiceTranscriptionModelSchema,
  mode: voiceCaptureModeSchema,
  status: z.literal("completed"),
  text: z.string(),
  durationMs: z.number().int().positive().optional(),
  createdAt: z.number().int().nonnegative(),
});

export const voiceTranscriptionEventSchema = z.discriminatedUnion("type", [
  z.object({
    apiVersion: engineApiVersionSchema,
    transcriptionId: z.string().min(1),
    type: z.literal("transcription_started"),
    createdAt: z.number().int().nonnegative(),
  }),
  z.object({
    apiVersion: engineApiVersionSchema,
    transcriptionId: z.string().min(1),
    type: z.literal("transcription_completed"),
    text: z.string(),
    createdAt: z.number().int().nonnegative(),
  }),
  z.object({
    apiVersion: engineApiVersionSchema,
    transcriptionId: z.string().min(1),
    type: z.literal("transcription_failed"),
    error: engineErrorSchema,
    createdAt: z.number().int().nonnegative(),
  }),
  z.object({
    apiVersion: engineApiVersionSchema,
    transcriptionId: z.string().min(1),
    type: z.literal("transcription_cancelled"),
    createdAt: z.number().int().nonnegative(),
  }),
]);

export type VoiceTranscriptionProvider = z.infer<typeof voiceTranscriptionProviderSchema>;
export type VoiceTranscriptionModel = z.infer<typeof voiceTranscriptionModelSchema>;
export type VoiceCaptureMode = z.infer<typeof voiceCaptureModeSchema>;
export type VoiceAudioFormat = z.infer<typeof voiceAudioFormatSchema>;
export type VoiceTranscriptionStatus = z.infer<typeof voiceTranscriptionStatusSchema>;
export type VoiceTranscriptionRequest = z.infer<typeof voiceTranscriptionRequestSchema>;
export type VoiceTranscriptResponse = z.infer<typeof voiceTranscriptResponseSchema>;
export type VoiceTranscriptionEvent = z.infer<typeof voiceTranscriptionEventSchema>;
