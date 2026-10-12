import { z } from "zod";
import { flowsCanvasSchema } from "./flows-canvas";

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

export const hifiFigmaWritePlanSchema = z.object({
  apiVersion: z.literal("v1"),
  kind: z.literal("hifi-wireframe"),
  name: z.string().min(1),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  imageUrl: z.string().url(),
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

export const figJamCanvasWritePlanSchema = figJamWritePlanSchema.extend({
  kind: z.literal("figjam-canvas-map"),
  canvas: flowsCanvasSchema,
}).superRefine((plan, ctx) => {
  const flows = new Map(plan.flows.map((flow) => [flow.id, flow]));
  const boards = new Set(plan.canvas.boards.map((board) => board.flowId));
  let valid = flows.size === plan.flows.length && boards.size === flows.size && boards.size === plan.canvas.boards.length;
  for (const board of plan.canvas.boards) {
    const flow = flows.get(board.flowId);
    const steps = new Set(flow?.steps.map((step) => step.id));
    const positions = new Set(board.positions.map((position) => position.stepId));
    const edges = new Set(board.edges.map((edge) => JSON.stringify([edge.source, edge.target])));
    valid = valid && !!flow && steps.size === flow.steps.length && positions.size === board.positions.length && positions.size === steps.size
      && board.positions.every((position) => steps.has(position.stepId)) && edges.size === board.edges.length
      && board.edges.every((edge) => steps.has(edge.source) && steps.has(edge.target) && edge.source !== edge.target);
  }
  if (!valid) ctx.addIssue({ code: "custom", message: "FigJam graph references are invalid or repeated." });
  if (plan.flows.reduce((total, flow) => total + flow.steps.length, 0) > 5000) {
    ctx.addIssue({ code: "custom", message: "The diagram is too large for a single FigJam export." });
  }
});

export const figmaCanvasWritePlanSchema = z.discriminatedUnion("kind", [
  figmaWritePlanSchema,
  hifiFigmaWritePlanSchema,
  figJamWritePlanSchema,
  figJamCanvasWritePlanSchema,
]);

export { createFigmaExportRequestSchema } from "./delivery-export";

export const createFigmaExportResponseSchema = z.object({
  apiVersion: z.literal("v1"),
  jobId: z.string().min(1),
  pairingCode: z.string().min(1),
  expiresAt: z.number().int().nonnegative(),
  status: z.enum(["requested", "claimed", "completed", "failed"]),
});

export type FigmaWritePlan = z.infer<typeof figmaWritePlanSchema>;
export type HifiFigmaWritePlan = z.infer<typeof hifiFigmaWritePlanSchema>;
export type FigJamCanvasWritePlan = z.infer<typeof figJamCanvasWritePlanSchema>;
export type FigJamWritePlan = z.infer<typeof figJamWritePlanSchema>;
export type FigmaCanvasWritePlan = z.infer<typeof figmaCanvasWritePlanSchema>;
export type { CreateFigmaExportRequest } from "./delivery-export";
export type CreateFigmaExportResponse = z.infer<typeof createFigmaExportResponseSchema>;
