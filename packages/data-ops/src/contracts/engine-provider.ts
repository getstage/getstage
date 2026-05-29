import { z } from "zod";

export const engineApiVersionSchema = z.literal("v1");

export const providerIdSchema = z.enum(["claude", "codex"]);

export const providerKindSchema = z.enum(["cli"]);

export const providerStatusSchema = z.enum([
  "ready",
  "missing",
  "not-authenticated",
  "checking",
  "warning",
  "disabled",
  "error",
]);

export const providerAuthStatusSchema = z.enum([
  "authenticated",
  "not-authenticated",
  "unknown",
]);

export const providerModelSourceSchema = z.enum([
  "provider",
  "fallback",
  "custom",
  "unknown",
]);

export const providerUpdateStatusSchema = z.enum([
  "idle",
  "checking",
  "updating",
  "updated",
  "failed",
  "unsupported",
]);

export const providerOptionChoiceSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  description: z.string().min(1).nullish(),
  isDefault: z.boolean().nullish(),
});

export const providerOptionDescriptorSchema = z.discriminatedUnion("type", [
  z.object({
    id: z.string().min(1),
    type: z.literal("select"),
    label: z.string().min(1),
    description: z.string().min(1).nullish(),
    options: z.array(providerOptionChoiceSchema),
    currentValue: z.string().min(1).nullish(),
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal("boolean"),
    label: z.string().min(1),
    description: z.string().min(1).nullish(),
    currentValue: z.boolean().nullish(),
  }),
]);

export const providerModelSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  source: providerModelSourceSchema,
  isDefault: z.boolean().nullish(),
  options: z.array(providerOptionDescriptorSchema).default([]),
});

export const providerErrorCodeSchema = z.enum([
  "missing_binary",
  "version_timeout",
  "not_authenticated",
  "readiness_failed",
  "invalid_request",
  "run_spawn_failed",
  "run_timeout",
  "run_cancelled",
  "provider_process_failed",
  "io_error",
  "internal_error",
]);

export const engineErrorSchema = z.object({
  code: providerErrorCodeSchema,
  message: z.string().min(1),
  providerId: providerIdSchema.nullish(),
  retryable: z.boolean(),
  detail: z.string().min(1).nullish(),
});

export const providerStatusRecordSchema = z.object({
  id: providerIdSchema,
  label: z.string().min(1),
  kind: providerKindSchema,
  installed: z.boolean(),
  authenticated: z.boolean(),
  authStatus: providerAuthStatusSchema,
  authLabel: z.string().min(1).nullish(),
  accountEmail: z.string().email().nullish(),
  enabled: z.boolean(),
  version: z.string().min(1).nullable(),
  status: providerStatusSchema,
  updateAvailable: z.boolean().nullable(),
  updateStatus: providerUpdateStatusSchema,
  updateHint: z.string().min(1).nullish(),
  checkedAt: z.number().int().nonnegative(),
  models: z.array(providerModelSchema),
  setupHint: z.string().min(1).nullish(),
  message: z.string().min(1).nullish(),
  error: engineErrorSchema.nullish(),
});

export const providerListResponseSchema = z.object({
  apiVersion: engineApiVersionSchema,
  providers: z.array(providerStatusRecordSchema),
});

export const providerUpdateResponseSchema = z.object({
  apiVersion: engineApiVersionSchema,
  providerId: providerIdSchema,
  status: providerUpdateStatusSchema,
  versionBefore: z.string().min(1).nullable(),
  versionAfter: z.string().min(1).nullable(),
  message: z.string().min(1).nullish(),
  error: engineErrorSchema.nullish(),
});

export type EngineApiVersion = z.infer<typeof engineApiVersionSchema>;
export type ProviderId = z.infer<typeof providerIdSchema>;
export type ProviderKind = z.infer<typeof providerKindSchema>;
export type ProviderStatus = z.infer<typeof providerStatusSchema>;
export type ProviderAuthStatus = z.infer<typeof providerAuthStatusSchema>;
export type ProviderModelSource = z.infer<typeof providerModelSourceSchema>;
export type ProviderUpdateStatus = z.infer<typeof providerUpdateStatusSchema>;
export type ProviderOptionChoice = z.infer<typeof providerOptionChoiceSchema>;
export type ProviderOptionDescriptor = z.infer<typeof providerOptionDescriptorSchema>;
export type ProviderModel = z.infer<typeof providerModelSchema>;
export type ProviderErrorCode = z.infer<typeof providerErrorCodeSchema>;
export type EngineError = z.infer<typeof engineErrorSchema>;
export type ProviderStatusRecord = z.infer<typeof providerStatusRecordSchema>;
export type ProviderListResponse = z.infer<typeof providerListResponseSchema>;
export type ProviderUpdateResponse = z.infer<typeof providerUpdateResponseSchema>;
