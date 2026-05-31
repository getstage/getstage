import { z } from "zod";

export const assetDocumentStatusSchema = z.enum(["complete", "shared"]);

export const assetUploadStatusSchema = z.enum(["uploading", "uploaded", "failed"]);

export const assetExportOptionIdSchema = z.enum(["code", "paper", "figma"]);

export const assetCategoryIdSchema = z.enum(["wireframes", "documents", "uploaded"]);

export const wireframeAssetSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  type: z.string().min(1),
  dateLabel: z.string().min(1),
  source: z.string().min(1),
  priority: z.string().min(1),
  screenId: z.string().min(1).optional(),
  previewUrl: z.string().url().optional(),
  figmaUrl: z.string().url().optional(),
});

export const documentAssetSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  status: assetDocumentStatusSchema,
  dateLabel: z.string().min(1),
  sourceModule: z.enum(["research", "strategy", "delivery"]).optional(),
  artifactId: z.string().min(1).optional(),
});

export const uploadedAssetSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  dateLabel: z.string().min(1),
  status: assetUploadStatusSchema,
  error: z.string().optional(),
  mimeType: z.string().optional(),
  sizeBytes: z.number().int().nonnegative().optional(),
  storageKey: z.string().min(1).optional(),
});

export const exportOptionSchema = z.object({
  id: assetExportOptionIdSchema,
  label: z.string().min(1),
  actionLabel: z.string().min(1),
  iconSrc: z.string().min(1),
  connected: z.boolean(),
  connectLabel: z.string().min(1).optional(),
});

export const assetCategorySchema = z.object({
  id: assetCategoryIdSchema,
  label: z.string().min(1),
  iconSrc: z.string().min(1),
});

export const assetsStatsSchema = z.object({
  wireframeCount: z.number().int().nonnegative(),
  documentCount: z.number().int().nonnegative(),
  uploadedCount: z.number().int().nonnegative(),
});

export const assetsInputSchema = z.object({
  projectId: z.string().min(1),
  projectName: z.string().min(1),
  wireframesArtifactId: z.string().min(1).optional(),
  researchArtifactId: z.string().min(1).optional(),
});

export const assetsArtifactSchema = z.object({
  apiVersion: z.literal("v1"),
  artifactKind: z.literal("assetsArtifact"),
  projectId: z.string().min(1),
  title: z.string().min(1),
  stats: assetsStatsSchema,
  wireframes: z.array(wireframeAssetSchema).default([]),
  documents: z.array(documentAssetSchema).default([]),
  uploadedAssets: z.array(uploadedAssetSchema).default([]),
  exportOptions: z.array(exportOptionSchema).default([]),
  categories: z.array(assetCategorySchema).default([]),
  generatedAt: z.number().int().nonnegative(),
});

export type AssetDocumentStatus = z.infer<typeof assetDocumentStatusSchema>;
export type AssetUploadStatus = z.infer<typeof assetUploadStatusSchema>;
export type AssetExportOptionId = z.infer<typeof assetExportOptionIdSchema>;
export type AssetCategoryId = z.infer<typeof assetCategoryIdSchema>;
export type WireframeAsset = z.infer<typeof wireframeAssetSchema>;
export type DocumentAsset = z.infer<typeof documentAssetSchema>;
export type UploadedAsset = z.infer<typeof uploadedAssetSchema>;
export type ExportOptionDefinition = z.infer<typeof exportOptionSchema>;
export type AssetCategoryDefinition = z.infer<typeof assetCategorySchema>;
export type AssetsStats = z.infer<typeof assetsStatsSchema>;
export type AssetsInput = z.infer<typeof assetsInputSchema>;
export type AssetsArtifact = z.infer<typeof assetsArtifactSchema>;
