import { z } from "zod";

export const referoReferenceKindSchema = z.enum(["screen", "flow", "style"]);

export const referoPlatformSchema = z.enum(["web", "ios", "android", "unknown"]);

/** Fixed UI Patterns row categories — engine maps Refero screen searches to these. */
export const referoUiPatternCategorySchema = z.enum([
  "onboarding",
  "homepage",
  "pricing",
  "checkout",
  "dashboard",
]);

export const referoSearchRequestSchema = z.object({
  query: z.string().min(1),
  platform: referoPlatformSchema.default("web"),
  limit: z.number().int().positive().max(20).default(8),
  tags: z.array(z.string().min(1)).default([]),
});

export const referoCategorySearchRequestSchema = z.object({
  category: referoUiPatternCategorySchema,
  query: z.string().min(1),
  platform: referoPlatformSchema.default("web"),
  limit: z.number().int().positive().max(20).default(3),
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
  /** Which UI Patterns row this screen was bucketed into (screens only). */
  uiPatternCategory: referoUiPatternCategorySchema.nullish(),
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

export const referoCategorySearchSchema = z.object({
  category: referoUiPatternCategorySchema,
  query: z.string().min(1),
  references: z.array(referoReferenceSchema).default([]),
});

export const referoContextSchema = z.object({
  /** Human-readable summary of all Refero queries in this run. */
  query: z.string().min(1),
  references: z.array(referoReferenceSchema).default([]),
  /** Per screen-type search buckets used to build UI Patterns rows. */
  categorySearches: z.array(referoCategorySearchSchema).default([]),
  fetchedAt: z.number().int().nonnegative(),
});

export type ReferoReferenceKind = z.infer<typeof referoReferenceKindSchema>;
export type ReferoPlatform = z.infer<typeof referoPlatformSchema>;
export type ReferoUiPatternCategory = z.infer<typeof referoUiPatternCategorySchema>;
export type ReferoSearchRequest = z.infer<typeof referoSearchRequestSchema>;
export type ReferoCategorySearchRequest = z.infer<typeof referoCategorySearchRequestSchema>;
export type ReferoScreenReference = z.infer<typeof referoScreenReferenceSchema>;
export type ReferoFlowReference = z.infer<typeof referoFlowReferenceSchema>;
export type ReferoStyleReference = z.infer<typeof referoStyleReferenceSchema>;
export type ReferoReference = z.infer<typeof referoReferenceSchema>;
export type ReferoCategorySearch = z.infer<typeof referoCategorySearchSchema>;
export type ReferoContext = z.infer<typeof referoContextSchema>;
