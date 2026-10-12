import { figJamCanvasWritePlanSchema, figJamWritePlanSchema } from "../contracts/figma-export";
import { flowsArtifactSchema, type FlowsArtifact } from "../contracts/flows";
import { getFlowCanvasBoard, validateFlowsCanvas } from "./flows-canvas";

export function buildFigJamWritePlan(artifact: FlowsArtifact, canvasAware = false) {
  validateFlowsCanvas(artifact);
  const flows = artifact.flows.map((flow) => ({
    id: flow.id, title: flow.title, description: flow.description,
    steps: [...flow.steps].sort((a, b) => a.order - b.order).map(({ id, label }) => ({ id, label })),
  }));
  const base = { apiVersion: "v1" as const, name: artifact.title, flows };
  return canvasAware || artifact.canvas
    ? figJamCanvasWritePlanSchema.parse({ ...base, kind: "figjam-canvas-map", canvas: { version: 1, boards: artifact.flows.map((flow) => getFlowCanvasBoard(flow, artifact.canvas)) } })
    : figJamWritePlanSchema.parse({ ...base, kind: "figjam-flow-map" });
}

export function isCurrentFigJamSnapshot(contentJson: string | undefined, writePlanJson: string) {
  if (!contentJson) return false;
  try {
    const raw = JSON.parse(writePlanJson);
    const plan = raw.kind === "figjam-canvas-map" ? figJamCanvasWritePlanSchema.parse(raw) : figJamWritePlanSchema.parse(raw);
    const current = buildFigJamWritePlan(flowsArtifactSchema.parse(JSON.parse(contentJson)), plan.kind === "figjam-canvas-map");
    return JSON.stringify(current) === JSON.stringify(plan);
  } catch {
    return false;
  }
}
