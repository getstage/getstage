import { z } from "zod";

const identifier = z.string().min(1).max(200);
export const canvasPositionSchema = z.object({
  x: z.number().finite().min(0).max(10000),
  y: z.number().finite().min(0).max(10000),
});
export const flowCanvasEdgeSchema = z.object({
  source: identifier,
  target: identifier,
});
export const flowCanvasBoardSchema = z.object({
  flowId: identifier,
  positions: z.array(canvasPositionSchema.extend({ stepId: identifier })).max(500),
  edges: z.array(flowCanvasEdgeSchema).max(2000),
});
export const flowsCanvasSchema = z.object({
  version: z.literal(1),
  boards: z.array(flowCanvasBoardSchema).max(100),
});
export const flowsCanvasEditSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("move"),
    flowId: identifier,
    stepId: identifier,
    from: canvasPositionSchema,
    to: canvasPositionSchema,
  }),
  z.object({
    type: z.literal("connect"),
    flowId: identifier,
    source: identifier,
    target: identifier,
  }),
  z.object({
    type: z.literal("disconnect"),
    flowId: identifier,
    source: identifier,
    target: identifier,
  }),
]);
export type FlowCanvasBoard = z.infer<typeof flowCanvasBoardSchema>;
export type FlowsCanvas = z.infer<typeof flowsCanvasSchema>;
export type FlowsCanvasEdit = z.infer<typeof flowsCanvasEditSchema>;
