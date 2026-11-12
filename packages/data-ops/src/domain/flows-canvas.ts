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

// Fixed so default columns (200px apart) never overlap, however long the label.
export const FLOW_CANVAS_NODE_WIDTH = 168;
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
  if (edit.type === "addStep") return addStep(artifact, flow, board, edit);
  if (edit.type === "removeStep") return removeStep(artifact, flow, board, edit.stepId);
  if (edit.type === "arrange") {
    const arranged = arrangeFlowBoard(flow, board, edit.direction);
    const next = { ...artifact, canvas: { version: 1 as const, boards: [...(artifact.canvas?.boards ?? []).filter((candidate) => candidate.flowId !== flow.id), arranged] } };
    validateFlowsCanvas(next);
    return next;
  }
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

// Adds a page/screen node with its own screen so the details dialog can describe it.
function addStep(
  artifact: FlowsArtifact,
  flow: Flow,
  board: FlowCanvasBoard,
  edit: Extract<FlowsCanvasEdit, { type: "addStep" }>,
): FlowsArtifact {
  if (flow.steps.some((step) => step.id === edit.stepId)) return artifact;
  if (edit.after && !flow.steps.some((step) => step.id === edit.after)) throw new Error("This node no longer exists.");
  const screenId = `screen-${edit.stepId}`;
  if (artifact.screens.some((screen) => screen.id === screenId)) throw new Error("This node already exists.");
  const order = Math.max(-1, ...flow.steps.map((step) => step.order)) + 1;
  const nextFlow: Flow = {
    ...flow,
    screenCount: flow.screenCount + 1,
    steps: [...flow.steps, { id: edit.stepId, order, label: edit.label, screenId }],
  };
  const nextBoard: FlowCanvasBoard = {
    ...board,
    positions: [...board.positions, { stepId: edit.stepId, ...edit.position }],
    edges: edit.after ? [...board.edges, { source: edit.after, target: edit.stepId }] : board.edges,
  };
  const next: FlowsArtifact = {
    ...artifact,
    flows: artifact.flows.map((candidate) => (candidate.id === flow.id ? nextFlow : candidate)),
    screens: [...artifact.screens, { id: screenId, title: edit.label, description: edit.label, flowCount: 1, keyElements: [] }],
    canvas: { version: 1, boards: [...(artifact.canvas?.boards ?? []).filter((candidate) => candidate.flowId !== flow.id), nextBoard] },
  };
  validateFlowsCanvas(next);
  return next;
}

// Removes a node, its position and every connection to or from it. Its screen goes too
// unless another node still shows it.
function removeStep(artifact: FlowsArtifact, flow: Flow, board: FlowCanvasBoard, stepId: string): FlowsArtifact {
  const step = flow.steps.find((candidate) => candidate.id === stepId);
  if (!step) return artifact;
  const steps = flow.steps.filter((candidate) => candidate.id !== stepId);
  const screenStillInFlow = steps.some((candidate) => candidate.screenId === step.screenId);
  const nextFlow: Flow = {
    ...flow,
    screenCount: step.screenId && !screenStillInFlow ? Math.max(0, flow.screenCount - 1) : flow.screenCount,
    steps,
  };
  const flows = artifact.flows.map((candidate) => (candidate.id === flow.id ? nextFlow : candidate));
  const flowsShowing = (screenId: string) => flows.filter((candidate) => candidate.steps.some((entry) => entry.screenId === screenId)).length;
  const screens = artifact.screens.flatMap((screen) => {
    if (screen.id !== step.screenId) return [screen];
    const flowCount = flowsShowing(screen.id);
    return flowCount ? [{ ...screen, flowCount }] : [];
  });
  const nextBoard: FlowCanvasBoard = {
    ...board,
    positions: board.positions.filter((position) => position.stepId !== stepId),
    edges: board.edges.filter((edge) => edge.source !== stepId && edge.target !== stepId),
  };
  const next: FlowsArtifact = {
    ...artifact,
    flows,
    screens,
    canvas: { version: 1, boards: [...(artifact.canvas?.boards ?? []).filter((candidate) => candidate.flowId !== flow.id), nextBoard] },
  };
  validateFlowsCanvas(next);
  return next;
}

// Sitemaps read top-down as a page tree; app screens read left to right as a journey.
export type FlowLayoutDirection = "vertical" | "horizontal";
export function flowLayoutDirection(category: string): FlowLayoutDirection {
  return category === "websites" ? "vertical" : "horizontal";
}

const LAYOUT_ORIGIN = { x: 48, y: 72 };
const LAYOUT_GAP = { vertical: { across: 208, down: 120 }, horizontal: { across: 136, down: 248 } };

// Layered layout from the board's connections: each node sits one level below (or right
// of) the first node that links to it, siblings side by side in step order, and every
// level centred on the widest one. Nodes nobody links to start new trees at level 0.
export function arrangeFlowBoard(flow: Flow, board: FlowCanvasBoard, direction: FlowLayoutDirection): FlowCanvasBoard {
  const order = new Map(flow.steps.map((step) => [step.id, step.order]));
  const byOrder = (a: string, b: string) => (order.get(a) ?? 0) - (order.get(b) ?? 0);
  const ids = board.positions.map((position) => position.stepId).sort(byOrder);
  const children = new Map(ids.map((id) => [id, [] as string[]]));
  const hasParent = new Set<string>();
  for (const edge of board.edges) {
    children.get(edge.source)?.push(edge.target);
    hasParent.add(edge.target);
  }
  for (const list of children.values()) list.sort(byOrder);

  const level = new Map<string, number>();
  const levels: string[][] = [];
  const queue = ids.filter((id) => !hasParent.has(id));
  if (queue.length === 0 && ids[0]) queue.push(ids[0]);
  const place = (id: string, depth: number) => {
    level.set(id, depth);
    (levels[depth] ??= []).push(id);
  };
  for (const id of queue) place(id, 0);
  for (let index = 0; index < queue.length; index += 1) {
    const id = queue[index];
    if (id === undefined) break;
    for (const child of children.get(id) ?? []) {
      if (level.has(child)) continue;
      place(child, (level.get(id) ?? 0) + 1);
      queue.push(child);
    }
    // A cycle with no entry point: start the next unplaced node as its own tree.
    if (index === queue.length - 1) {
      const next = ids.find((candidate) => !level.has(candidate));
      if (next) {
        place(next, 0);
        queue.push(next);
      }
    }
  }

  const gap = LAYOUT_GAP[direction];
  const widest = Math.max(...levels.map((row) => row.length));
  const positions = levels.flatMap((row, depth) => {
    const offset = ((widest - row.length) * gap.across) / 2;
    return row.map((stepId, index) => {
      const across = Math.round(offset + index * gap.across);
      const down = depth * gap.down;
      return direction === "vertical"
        ? { stepId, x: LAYOUT_ORIGIN.x + across, y: LAYOUT_ORIGIN.y + down }
        : { stepId, x: LAYOUT_ORIGIN.x + down, y: LAYOUT_ORIGIN.y + across };
    });
  });
  return { ...board, positions };
}

export function arrangeFlowsCanvas(artifact: FlowsArtifact, direction: FlowLayoutDirection): FlowsCanvas {
  return {
    version: 1,
    boards: artifact.flows.map((flow) => arrangeFlowBoard(flow, getFlowCanvasBoard(flow, artifact.canvas), direction)),
  };
}
