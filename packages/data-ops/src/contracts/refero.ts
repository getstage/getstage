import { z } from "zod";

export const referoReferenceKindSchema = z.enum(["screen", "flow", "style"]);

export const referoPlatformSchema = z.enum(["web", "ios", "android", "unknown"]);

export const referoSearchRequestSchema = z.object({
  query: z.string().min(1),
  platform: referoPlatformSchema.default("web"),
  limit: z.number().int().positive().max(20).default(8),
  tags: z.array(z.string().min(1)).default([]),
});

/** Rust/Convex JSON uses null for absent optional fields — nullish, not optional-only. */
const referoOptionalTextSchema = z.string().min(1).nullish();

/** Refero MCP may return relative paths or non-standard URLs — do not require absolute URL. */
const referoOptionalUrlSchema = referoOptionalTextSchema;

export const referoReferenceBaseSchema = z.object({
  id: z.string().min(1),
  kind: referoReferenceKindSchema,
  title: z.string().min(1),
  productName: referoOptionalTextSchema,
  productUrl: referoOptionalUrlSchema,
  platform: referoPlatformSchema.default("unknown"),
  sourceUrl: referoOptionalUrlSchema,
  thumbnailUrl: referoOptionalUrlSchema,
  imageUrl: referoOptionalUrlSchema,
  summary: z.string().nullish(),
  tags: z.array(z.string().min(1)).default([]),
});

export const referoScreenReferenceSchema = referoReferenceBaseSchema.extend({
  kind: z.literal("screen"),
  screenType: referoOptionalTextSchema,
});

export const referoFlowReferenceSchema = referoReferenceBaseSchema.extend({
  kind: z.literal("flow"),
  flowType: referoOptionalTextSchema,
  stepCount: z.number().int().positive().nullish(),
});

export const referoStyleReferenceSchema = referoReferenceBaseSchema.extend({
  kind: z.literal("style"),
  styleType: referoOptionalTextSchema,
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
