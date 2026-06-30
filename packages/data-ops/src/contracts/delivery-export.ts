import { z } from "zod";

export const wireframeDeliveryRequestSchema = z.object({
  projectId: z.string().min(1),
  artifactId: z.string().min(1),
  screenId: z.string().min(1),
});

export const createFigmaExportRequestSchema = wireframeDeliveryRequestSchema.extend({
  hifiHtml: z.string().min(1).optional(),
  hifiPreviewPng: z.array(z.number().int().min(0).max(255)).optional(),
  hifiPreviewWidth: z.number().int().positive().max(4096).optional(),
  hifiPreviewHeight: z.number().int().positive().max(4096).optional(),
});

export const createPaperExportRequestSchema = wireframeDeliveryRequestSchema.extend({
  hifiHtml: z.string().min(1).optional(),
  hifiPreviewDataUrl: z.string().startsWith("data:image/png;base64,").optional(),
  hifiPreviewWidth: z.number().int().positive().max(4096).optional(),
  hifiPreviewHeight: z.number().int().positive().max(4096).optional(),
});

export const codeExportFileSchema = z.object({
  relativePath: z.string().min(1),
  content: z.string(),
});

export const createCodeExportResponseSchema = z.object({
  apiVersion: z.literal("v1"),
  suggestedDirectoryName: z.string().min(1),
  files: z.array(codeExportFileSchema).min(1),
});

export const saveCodeExportResponseSchema = z.object({
  apiVersion: z.literal("v1"),
  cancelled: z.boolean(),
  directoryPath: z.string().min(1).optional(),
  fileCount: z.number().int().nonnegative(),
});

export const createPaperExportResponseSchema = z.object({
  apiVersion: z.literal("v1"),
  status: z.literal("completed"),
  artboardId: z.string().min(1).optional(),
  message: z.string().min(1),
});

export const paperConnectionStatusResponseSchema = z.object({
  apiVersion: z.literal("v1"),
  ready: z.boolean(),
  status: z.enum(["ready", "not-ready"]),
  message: z.string().min(1),
  fileName: z.string().min(1).optional(),
  pageName: z.string().min(1).optional(),
});

export const createFigJamExportRequestSchema = z.object({
  projectId: z.string().min(1),
  artifactId: z.string().min(1),
});

export type WireframeDeliveryRequest = z.infer<typeof wireframeDeliveryRequestSchema>;
export type CreateFigmaExportRequest = z.infer<typeof createFigmaExportRequestSchema>;
export type CreatePaperExportRequest = z.infer<typeof createPaperExportRequestSchema>;
export type CreateCodeExportResponse = z.infer<typeof createCodeExportResponseSchema>;
export type SaveCodeExportResponse = z.infer<typeof saveCodeExportResponseSchema>;
export type CreatePaperExportResponse = z.infer<typeof createPaperExportResponseSchema>;
export type PaperConnectionStatusResponse = z.infer<typeof paperConnectionStatusResponseSchema>;
export type CreateFigJamExportRequest = z.infer<typeof createFigJamExportRequestSchema>;
