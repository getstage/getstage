import { z } from "zod";

export const moodboardImportModeSchema = z.enum(["upload", "figma", "ai"]);

export const moodboardReferenceSourceSchema = z.enum(["upload", "figma", "url"]);

export const moodboardDirectionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  hasStyleGuide: z.boolean().default(false),
  styleGuideId: z.string().min(1).optional(),
  referenceCount: z.number().int().nonnegative().optional(),
});

export const moodboardReferenceSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).optional(),
  imageUrl: z.string().min(1),
  imageAssetKey: z.string().min(1).optional(),
  thumbnailUrl: z.string().min(1).optional(),
  thumbnailAssetKey: z.string().min(1).optional(),
  source: moodboardReferenceSourceSchema,
  sourceUrl: z.string().url().optional(),
  uploadedAssetId: z.string().min(1).optional(),
  directionId: z.string().min(1).nullable().default(null),
  isInMoodboard: z.boolean().default(true),
  order: z.number().int().nonnegative().optional(),
});

export const moodboardUploadedFileSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  sizeBytes: z.number().int().nonnegative(),
  uploadedAssetId: z.string().min(1).optional(),
});

export const moodboardAtmosphereMetricSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
  color: z.string().min(1),
  tint: z.string().min(1),
  position: z.number().min(0).max(100),
});

export const moodboardColorPaletteSchema = z.object({
  label: z.string().min(1),
  hex: z.string().min(1),
  colors: z.array(z.string().min(1)).min(1),
  highlightIndex: z.number().int().nonnegative().optional(),
});

export const moodboardTypographyRowSchema = z.object({
  id: z.string().min(1),
  size: z.number().int().positive(),
  weight: z.string().min(1),
  lineHeight: z.string().min(1),
  className: z.string().min(1),
  sampleText: z.string().min(1).optional(),
});

export const moodboardTypographyWeightSampleSchema = z.object({
  label: z.string().min(1),
  className: z.string().min(1),
});

export const moodboardStyleGuideSchema = z.object({
  id: z.string().min(1),
  directionId: z.string().min(1),
  title: z.string().min(1),
  subtitle: z.string().min(1).optional(),
  atmosphere: z.array(moodboardAtmosphereMetricSchema).default([]),
  colorPalettes: z.array(moodboardColorPaletteSchema).default([]),
  typography: z.object({
    fontFamily: z.string().min(1),
    previewSize: z.number().int().positive().default(28),
    rows: z.array(moodboardTypographyRowSchema).default([]),
    weightSamples: z.array(moodboardTypographyWeightSampleSchema).default([]),
  }),
  componentSwatchCount: z.number().int().nonnegative().default(6),
});

export const moodboardInputSchema = z.object({
  projectId: z.string().min(1),
  projectName: z.string().min(1),
  strategyArtifactId: z.string().min(1).optional(),
  importMode: moodboardImportModeSchema,
  figmaUrl: z.string().url().optional(),
  referoQuery: z.string().min(1).max(500).optional(),
  uploadedAssetIds: z.array(z.string().min(1)).default([]),
  uploadedFiles: z.array(moodboardUploadedFileSchema).default([]),
  additionalNotes: z.string().min(1).max(2000).optional(),
});

export const moodboardArtifactSchema = z.object({
  apiVersion: z.literal("v1"),
  artifactKind: z.literal("moodboardArtifact"),
  projectId: z.string().min(1),
  title: z.string().min(1),
  strategyArtifactId: z.string().min(1).optional(),
  importMode: moodboardImportModeSchema.optional(),
  directions: z.array(moodboardDirectionSchema).default([]),
  references: z.array(moodboardReferenceSchema).default([]),
  uploadedFiles: z.array(moodboardUploadedFileSchema).default([]),
  styleGuides: z.array(moodboardStyleGuideSchema).default([]),
  generatedAt: z.number().int().nonnegative(),
});

export type MoodboardImportMode = z.infer<typeof moodboardImportModeSchema>;
export type MoodboardReferenceSource = z.infer<typeof moodboardReferenceSourceSchema>;
export type MoodboardDirection = z.infer<typeof moodboardDirectionSchema>;
export type MoodboardReference = z.infer<typeof moodboardReferenceSchema>;
export type MoodboardUploadedFile = z.infer<typeof moodboardUploadedFileSchema>;
export type MoodboardStyleGuide = z.infer<typeof moodboardStyleGuideSchema>;
export type MoodboardInput = z.infer<typeof moodboardInputSchema>;
export type MoodboardArtifact = z.infer<typeof moodboardArtifactSchema>;
