import { z } from "zod";

export const wireframeKindSchema = z.enum(["lofi", "hifi"]);

export const wireframeBrandSourceSchema = z.enum(["style-guide", "brand-kit"]);

export const wireframeScreenKindSchema = z.enum(["Page", "Section"]);

export const wireframeConfigureScreenSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  kind: wireframeScreenKindSchema,
  priority: z.string().min(1),
  required: z.boolean(),
  selected: z.boolean(),
});

export const wireframeBrandKitSchema = z.object({
  fileName: z.string().min(1),
  sizeBytes: z.number().int().nonnegative(),
  fileSizeLabel: z.string().min(1),
});

export const wireframeGeneratedScreenSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  priority: z.string().min(1),
  generatedAtLabel: z.string().min(1),
  figmaUrl: z.string().url().optional(),
});

export const wireframesStatsSchema = z.object({
  flowsScreenCount: z.number().int().nonnegative(),
  moodboardPatternCount: z.number().int().nonnegative(),
  totalConfigureScreenCount: z.number().int().nonnegative(),
});

export const wireframesInputSchema = z.object({
  projectId: z.string().min(1),
  projectName: z.string().min(1),
  wireframeKind: wireframeKindSchema,
  brandSource: wireframeBrandSourceSchema,
  selectedScreenIds: z.array(z.string().min(1)).default([]),
  layoutPreference: z.string().max(2000).optional(),
  styleDirectionId: z.number().int().positive().optional(),
});

export const wireframesArtifactSchema = z.object({
  apiVersion: z.literal("v1"),
  artifactKind: z.literal("wireframesArtifact"),
  projectId: z.string().min(1),
  title: z.string().min(1),
  wireframeKind: wireframeKindSchema,
  brandSource: wireframeBrandSourceSchema.optional(),
  stats: wireframesStatsSchema,
  configureScreens: z.array(wireframeConfigureScreenSchema).default([]),
  brandKit: wireframeBrandKitSchema.optional(),
  layoutPreference: z.string().optional(),
  generatedScreens: z.array(wireframeGeneratedScreenSchema).default([]),
  generatedAt: z.number().int().nonnegative(),
  generatedAtLabel: z.string().min(1),
  figmaSymbolUrl: z.string().url(),
});

export type WireframeKind = z.infer<typeof wireframeKindSchema>;
export type WireframeBrandSource = z.infer<typeof wireframeBrandSourceSchema>;
export type WireframeScreenKind = z.infer<typeof wireframeScreenKindSchema>;
export type WireframeConfigureScreen = z.infer<typeof wireframeConfigureScreenSchema>;
export type WireframeBrandKit = z.infer<typeof wireframeBrandKitSchema>;
export type WireframeGeneratedScreen = z.infer<typeof wireframeGeneratedScreenSchema>;
export type WireframesStats = z.infer<typeof wireframesStatsSchema>;
export type WireframesInput = z.infer<typeof wireframesInputSchema>;
export type WireframesArtifact = z.infer<typeof wireframesArtifactSchema>;
