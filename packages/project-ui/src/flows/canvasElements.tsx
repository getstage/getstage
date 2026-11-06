import {
  Handle, MarkerType, Position,
  type Edge, type Node, type NodeProps, type SmoothStepPathOptions,
} from "@xyflow/react";
import type { FlowsArtifact } from "@stage/data-ops/contracts";
import { FLOW_CANVAS_NODE_WIDTH, getFlowCanvasBoard, getFlowCanvasBoardSize } from "@stage/data-ops/domain";
import "@xyflow/react/dist/style.css";
import "./flowsCanvas.css";

// How a Flows / Sitemap canvas looks: one board per flow, a node per step, arrows for the saved connections.
// Shared by the Mac canvas (which adds editing) and the read-only web canvas.

export type StepNode = Node<{ label: string; flowId: string; stepId: string; highlighted?: boolean }, "step">;
export type BoardNode = Node<{ label: string }, "board">;
export type CanvasNode = StepNode | BoardNode;
export type CanvasEdge = Edge<{ flowId: string; source: string; target: string }, "smoothstep"> & { pathOptions?: SmoothStepPathOptions };
export const nodeId = (flowId: string, stepId: string) => `step:${encodeURIComponent(flowId)}:${encodeURIComponent(stepId)}`;

export function buildElements(artifact: FlowsArtifact, label: string) {
  const nodes: CanvasNode[] = [];
  const edges: CanvasEdge[] = [];
  let top = 40;
  for (const flow of artifact.flows) {
    const board = getFlowCanvasBoard(flow, artifact.canvas);
    const { width, height } = getFlowCanvasBoardSize(board);
    const parentId = `board:${encodeURIComponent(flow.id)}`;
    nodes.push({ id: parentId, type: "board", position: { x: 40, y: top }, data: { label: artifact.flows.length === 1 ? label.toUpperCase() : flow.title.toUpperCase() }, style: { width, height }, draggable: false, selectable: false, focusable: false });
    for (const step of flow.steps) {
      const position = board.positions.find((entry) => entry.stepId === step.id);
      if (!position) continue;
      nodes.push({ id: nodeId(flow.id, step.id), ariaLabel: step.label, type: "step", parentId, extent: "parent", position: { x: position.x, y: position.y }, data: { label: step.label, flowId: flow.id, stepId: step.id }, style: { width: FLOW_CANVAS_NODE_WIDTH } });
    }
    const labels = new Map(flow.steps.map((step) => [step.id, step.label]));
    for (const edge of board.edges) {
      edges.push({ ariaLabel: `${labels.get(edge.source) ?? edge.source} to ${labels.get(edge.target) ?? edge.target}`, id: JSON.stringify([flow.id, edge.source, edge.target]), source: nodeId(flow.id, edge.source), target: nodeId(flow.id, edge.target), type: "smoothstep", pathOptions: { borderRadius: 24 }, data: { flowId: flow.id, ...edge }, markerEnd: { type: MarkerType.Arrow, color: "#6155FF", width: 12, height: 12 }, style: { stroke: "#6155FF", strokeWidth: 1 } });
    }
    top += height + 100;
  }
  return { nodes, edges };
}

function CanvasStep({ data, selected }: NodeProps<StepNode>) {
  return <div className={`flows-canvas-step${selected || data.highlighted ? " is-selected" : ""}`}>
    <Handle type="target" position={Position.Left} isConnectable={false} />
    <StepLabel label={data.label} />
    <Handle type="source" position={Position.Right} isConnectable={false} />
  </div>;
}
// Generated labels read "Screen → action". The node shows the screen name and a
// two-line action; the full label stays in the tooltip and the screen dialog.
function StepLabel({ label }: { label: string }) {
  const [screen, action] = label.split(/\s*(?:→|->)\s*/, 2);
  return <span title={label}>
    <strong className="flows-canvas-step-title">{screen}</strong>
    {action ? <span className="flows-canvas-step-action">{action}</span> : null}
  </span>;
}
function CanvasBoard({ data }: NodeProps<BoardNode>) {
  return <div className="flows-canvas-board"><span className="flows-canvas-board-label">{data.label}</span></div>;
}
export const nodeTypes = { step: CanvasStep, board: CanvasBoard };
export const ariaLabelConfig = {
  "node.a11yDescription.default": "Double-click or press Enter to open screen details. Press Delete to delete it. Use arrow keys to move it. Activate Connect nodes, then press Enter on the source and target. Escape cancels.",
  "edge.a11yDescription.default": "Press Enter to select a connection, then press Delete to delete it. Escape clears selection.",
};


export function CanvasButton({ label, icon, active, disabled, onClick }: { label: string; icon: string; active?: boolean; disabled?: boolean; onClick: () => void }) {
  return <button type="button" data-tooltip={label} aria-label={label} aria-pressed={active} disabled={disabled} onClick={onClick} className={`flows-canvas-tool${active ? " is-active" : ""}${icon === "chat" ? " is-chat" : ""}`}><img src={`/logos/flows/${icon}.svg`} alt="" aria-hidden="true" /></button>;
}
