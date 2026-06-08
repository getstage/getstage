import { z } from "zod";

export const figmaWriteBlockSchema = z.object({
  id: z.string().min(1),
  kind: z.string().min(1),
  label: z.string().min(1),
  height: z.number().int().positive(),
});

export const figmaWriteSectionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  blocks: z.array(figmaWriteBlockSchema),
});

export const figmaWritePlanSchema = z.object({
  apiVersion: z.literal("v1"),
  kind: z.literal("wireframe"),
  name: z.string().min(1),
  width: z.number().int().positive(),
  sections: z.array(figmaWriteSectionSchema),
});

export const figJamFlowStepSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
});

export const figJamFlowSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  steps: z.array(figJamFlowStepSchema),
});

export const figJamWritePlanSchema = z.object({
  apiVersion: z.literal("v1"),
  kind: z.literal("figjam-flow-map"),
  name: z.string().min(1),
  flows: z.array(figJamFlowSchema),
});

export const figmaCanvasWritePlanSchema = z.discriminatedUnion("kind", [
  figmaWritePlanSchema,
  figJamWritePlanSchema,
]);

export { wireframeDeliveryRequestSchema as createFigmaExportRequestSchema } from "./delivery-export";

export const createFigmaExportResponseSchema = z.object({
  apiVersion: z.literal("v1"),
  jobId: z.string().min(1),
  pairingCode: z.string().min(1),
  expiresAt: z.number().int().nonnegative(),
  status: z.enum(["requested", "claimed", "completed", "failed"]),
});

export type FigmaWritePlan = z.infer<typeof figmaWritePlanSchema>;
export type FigJamWritePlan = z.infer<typeof figJamWritePlanSchema>;
export type FigmaCanvasWritePlan = z.infer<typeof figmaCanvasWritePlanSchema>;
export type { WireframeDeliveryRequest as CreateFigmaExportRequest } from "./delivery-export";
export type CreateFigmaExportResponse = z.infer<typeof createFigmaExportResponseSchema>;
