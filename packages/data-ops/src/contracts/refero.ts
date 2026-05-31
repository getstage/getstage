import { z } from "zod";

export const referoReferenceKindSchema = z.enum(["screen", "flow", "style"]);

export const referoPlatformSchema = z.enum(["web", "ios", "android", "unknown"]);

export const referoSearchRequestSchema = z.object({
  query: z.string().min(1),
  platform: referoPlatformSchema.default("web"),
  limit: z.number().int().positive().max(20).default(8),
  tags: z.array(z.string().min(1)).default([]),
});

export const referoReferenceBaseSchema = z.object({
  id: z.string().min(1),
  kind: referoReferenceKindSchema,
  title: z.string().min(1),
  productName: z.string().min(1).optional(),
  productUrl: z.string().url().optional(),
  platform: referoPlatformSchema.default("unknown"),
  sourceUrl: z.string().url().optional(),
  thumbnailUrl: z.string().url().optional(),
  imageUrl: z.string().url().optional(),
  summary: z.string().optional(),
  tags: z.array(z.string().min(1)).default([]),
});

export const referoScreenReferenceSchema = referoReferenceBaseSchema.extend({
  kind: z.literal("screen"),
  screenType: z.string().min(1).optional(),
});

export const referoFlowReferenceSchema = referoReferenceBaseSchema.extend({
  kind: z.literal("flow"),
  flowType: z.string().min(1).optional(),
  stepCount: z.number().int().positive().optional(),
});

export const referoStyleReferenceSchema = referoReferenceBaseSchema.extend({
  kind: z.literal("style"),
  styleType: z.string().min(1).optional(),
});

export const referoReferenceSchema = z.discriminatedUnion("kind", [
  referoScreenReferenceSchema,
  referoFlowReferenceSchema,
  referoStyleReferenceSchema,
]);

export const referoContextSchema = z.object({
  query: z.string().min(1),
  references: z.array(referoReferenceSchema).default([]),
  fetchedAt: z.number().int().nonnegative(),
});

export type ReferoReferenceKind = z.infer<typeof referoReferenceKindSchema>;
export type ReferoPlatform = z.infer<typeof referoPlatformSchema>;
export type ReferoSearchRequest = z.infer<typeof referoSearchRequestSchema>;
export type ReferoScreenReference = z.infer<typeof referoScreenReferenceSchema>;
export type ReferoFlowReference = z.infer<typeof referoFlowReferenceSchema>;
export type ReferoStyleReference = z.infer<typeof referoStyleReferenceSchema>;
export type ReferoReference = z.infer<typeof referoReferenceSchema>;
export type ReferoContext = z.infer<typeof referoContextSchema>;
