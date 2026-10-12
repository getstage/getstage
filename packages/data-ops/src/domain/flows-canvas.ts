import type { Flow, FlowsArtifact } from "../contracts/flows";
import { flowsCanvasEditSchema, type FlowCanvasBoard, type FlowsCanvas, type FlowsCanvasEdit } from "../contracts/flows-canvas";

export function getFlowCanvasBoard(flow: Flow, canvas?: FlowsCanvas): FlowCanvasBoard {
  const saved = canvas?.boards.find((board) => board.flowId === flow.id);
  if (saved) return saved;
  const steps = [...flow.steps].sort((a, b) => a.order - b.order);
  return {
    flowId: flow.id,
    positions: steps.map((step, index) => ({ stepId: step.id, x: 48 + (index % 6) * 200, y: 100 + Math.floor(index / 6) * 110 })),
    edges: steps.flatMap((step, index) => {
      const next = steps[index + 1];
      return next ? [{ source: step.id, target: next.id }] : [];
    }),
  };
}

export const getFlowCanvasNodeWidth = (label: string) => Math.min(260, Math.max(70, label.length * 8 + 28));
export function getFlowCanvasBoardSize(board: FlowCanvasBoard) {
  return {
    width: Math.max(844, ...board.positions.map((position) => position.x + 308)),
    height: Math.max(404, ...board.positions.map((position) => position.y + 130)),
  };
}

export function validateFlowsCanvas(artifact: FlowsArtifact) {
  const flowIds = new Set<string>();
  for (const flow of artifact.flows) {
    if (flowIds.has(flow.id)) throw new Error("Flow IDs must be unique.");
    flowIds.add(flow.id);
    const steps = new Set<string>();
    for (const step of flow.steps) {
      if (steps.has(step.id)) throw new Error("Step IDs must be unique within a flow.");
      steps.add(step.id);
    }
  }
  const boardIds = new Set<string>();
  for (const board of artifact.canvas?.boards ?? []) {
    const flow = artifact.flows.find((candidate) => candidate.id === board.flowId);
    if (!flow || boardIds.has(board.flowId)) throw new Error("Canvas board references an invalid or repeated flow.");
    boardIds.add(board.flowId);
    const stepIds = new Set(flow.steps.map((step) => step.id));
    const positions = new Set<string>();
    for (const position of board.positions) {
      if (!stepIds.has(position.stepId) || positions.has(position.stepId)) throw new Error("Canvas position references an invalid or repeated step.");
      positions.add(position.stepId);
    }
    if (positions.size !== stepIds.size) throw new Error("Canvas must position every step.");
    const edges = new Set<string>();
    for (const edge of board.edges) {
      const id = JSON.stringify([edge.source, edge.target]);
      if (!stepIds.has(edge.source) || !stepIds.has(edge.target) || edge.source === edge.target || edges.has(id)) {
        throw new Error("Canvas connection is invalid or repeated.");
      }
      edges.add(id);
    }
  }
}

export function assertFlowsCanvasIdentity(previous: FlowsArtifact, next: FlowsArtifact) {
  if (!previous.canvas) return;
  const sameScreens = JSON.stringify(previous.screens.map((screen) => screen.id).sort())
    === JSON.stringify(next.screens.map((screen) => screen.id).sort());
  const sameNodes = previous.flows.every((flow) => {
    const candidate = next.flows.find((entry) => entry.id === flow.id);
    return candidate?.steps.length === flow.steps.length && flow.steps.every((step) =>
      candidate.steps.some((entry) => entry.id === step.id && entry.screenId === step.screenId && entry.order === step.order));
  });
  if (!sameScreens || !sameNodes) {
    throw new Error("Saved diagram nodes and screen mappings cannot be replaced. Update their content instead.");
  }
}

export function applyFlowsCanvasEdit(artifact: FlowsArtifact, input: FlowsCanvasEdit): FlowsArtifact {
  const edit = flowsCanvasEditSchema.parse(input);
  validateFlowsCanvas(artifact);
  const flow = artifact.flows.find((candidate) => candidate.id === edit.flowId);
  if (!flow) throw new Error("This diagram no longer exists. Reload and try again.");
  const board = getFlowCanvasBoard(flow, artifact.canvas);
  const steps = new Set(flow.steps.map((step) => step.id));
  let nextBoard: FlowCanvasBoard;
  if (edit.type === "move") {
    const current = board.positions.find((position) => position.stepId === edit.stepId);
    if (!current) throw new Error("This node no longer exists.");
    if (current.x === edit.to.x && current.y === edit.to.y) return artifact;
    if (current.x !== edit.from.x || current.y !== edit.from.y) {
      throw new Error("Someone moved this node. Review its new position and try again.");
    }
    nextBoard = { ...board, positions: board.positions.map((position) => position.stepId === edit.stepId ? { ...position, ...edit.to } : position) };
  } else {
    if (!steps.has(edit.source) || !steps.has(edit.target) || edit.source === edit.target) throw new Error("Choose two different nodes in the same diagram.");
    const exists = board.edges.some((edge) => edge.source === edit.source && edge.target === edit.target);
    if ((edit.type === "connect" && exists) || (edit.type === "disconnect" && !exists)) return artifact;
    nextBoard = {
      ...board,
      edges: edit.type === "connect"
        ? [...board.edges, { source: edit.source, target: edit.target }]
        : board.edges.filter((edge) => edge.source !== edit.source || edge.target !== edit.target),
    };
  }
  const canvas = { version: 1 as const, boards: [...(artifact.canvas?.boards ?? []).filter((candidate) => candidate.flowId !== edit.flowId), nextBoard] };
  const next = { ...artifact, canvas };
  validateFlowsCanvas(next);
  return next;
}
