import { useEffect, useRef, useState, type ReactNode } from "react";
import { Graph, LinkBreak } from "@phosphor-icons/react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  Background, BackgroundVariant, Handle, MarkerType, Panel, Position, ReactFlow,
  ReactFlowProvider, applyNodeChanges, useReactFlow,
  type Edge, type SmoothStepPathOptions, type Node, type NodeProps, type NodeChange,
} from "@xyflow/react";
import type { FlowsArtifact, FlowsCanvasEdit, ProjectCategory } from "@stage/data-ops/contracts";
import { FLOW_CANVAS_NODE_WIDTH, getFlowCanvasBoard, getFlowCanvasBoardSize } from "@stage/data-ops/domain";
import { STAGE_CHAT_OPEN_REQUEST } from "@/lib/companion/shortcutEvents";
import { ScreenDetailsDialog, type ScreenDetailsChange } from "./ScreenDetailsDialog";
import { findStepScreen } from "./stepScreen";
import "@xyflow/react/dist/style.css";
import "./flowsCanvas.css";

type StepNode = Node<{ label: string; flowId: string; stepId: string; highlighted?: boolean }, "step">;
type BoardNode = Node<{ label: string }, "board">;
type CanvasNode = StepNode | BoardNode;
type CanvasEdge = Edge<{ flowId: string; source: string; target: string }, "smoothstep"> & { pathOptions?: SmoothStepPathOptions };
type Props = {
  artifact: FlowsArtifact;
  updatedAt: number;
  projectCategory: ProjectCategory;
  disabled?: boolean;
  onAdd: () => void;
  onSaveScreen: (flowId: string, stepId: string, change: ScreenDetailsChange) => Promise<void>;
  actions?: ReactNode;
  onEdit: (edit: FlowsCanvasEdit) => Promise<{ artifact: FlowsArtifact; updatedAt: number }>;
};
const nodeId = (flowId: string, stepId: string) => `step:${encodeURIComponent(flowId)}:${encodeURIComponent(stepId)}`;

function buildElements(artifact: FlowsArtifact, label: string) {
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
const nodeTypes = { step: CanvasStep, board: CanvasBoard };
const ariaLabelConfig = {
  "node.a11yDescription.default": "Double-click or press Enter to open screen details. Use arrow keys to move it. Activate Connect nodes, then press Enter on the source and target. Escape cancels.",
  "edge.a11yDescription.default": "Press Enter to select a connection, then activate Remove selected connection to delete it. Escape clears selection.",
};

export function FlowsCanvas(props: Props) {
  return <ReactFlowProvider><CanvasWorkspace {...props} /></ReactFlowProvider>;
}

function CanvasWorkspace({ artifact, updatedAt, projectCategory, disabled = false, onAdd, actions, onEdit, onSaveScreen }: Props) {
  const label = projectCategory === "websites" ? "Sitemap" : "Flows";
  const [nodes, setNodes] = useState(() => buildElements(artifact, label).nodes);
  const [edges, setEdges] = useState(() => buildElements(artifact, label).edges);
  const [tool, setTool] = useState<"select" | "connect">("select");
  const [source, setSource] = useState<StepNode | undefined>();
  const [selectedEdge, setSelectedEdge] = useState<CanvasEdge | undefined>();
  const [unlinkMenu, setUnlinkMenu] = useState<{ x: number; y: number; anchor: SVGElement }>();
  const [details, setDetails] = useState<{ flowId: string; stepId: string; anchor: HTMLElement }>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const savingRef = useRef(false);
  const committedAt = useRef(updatedAt);
  const latest = useRef(artifact);
  const dragStarts = useRef(new Map<string, { x: number; y: number }>());
  const { zoomIn, zoomOut } = useReactFlow<CanvasNode, CanvasEdge>();

  function hydrate(next: FlowsArtifact) {
    const elements = buildElements(next, label);
    latest.current = next;
    setNodes((current) => elements.nodes.map((node) => {
      const previous = current.find((entry) => entry.id === node.id);
      return { ...node, position: previous?.dragging ? previous.position : node.position, dragging: previous?.dragging, selected: previous?.selected ?? false };
    }));
    setEdges(elements.edges);
    return elements;
  }
  useEffect(() => {
    if (updatedAt < committedAt.current) return;
    committedAt.current = updatedAt;
    const elements = buildElements(artifact, label);
    latest.current = artifact;
    setNodes((current) => elements.nodes.map((node) => {
      const previous = current.find((entry) => entry.id === node.id);
      return { ...node, position: previous?.dragging ? previous.position : node.position, dragging: previous?.dragging, selected: previous?.selected ?? false };
    }));
    setEdges(elements.edges);
    setUnlinkMenu(undefined);
    setSource((current) => current && elements.nodes.some((node) => node.id === current.id) ? current : undefined);
    setSelectedEdge((current) => current && elements.edges.some((edge) => edge.id === current.id) ? current : undefined);
  }, [artifact, updatedAt, label]);

  async function save(edit: FlowsCanvasEdit) {
    if (disabled || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setError(undefined);
    try {
      const result = await onEdit(edit);
      if (result.updatedAt >= committedAt.current) {
        committedAt.current = result.updatedAt;
        const elements = hydrate(result.artifact);
        if (edit.type === "connect") {
          const id = JSON.stringify([edit.flowId, edit.source, edit.target]);
          setSelectedEdge(elements.edges.find((edge) => edge.id === id));
        }
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save the diagram.");
      hydrate(latest.current);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }
  function chooseNode(node: CanvasNode) {
    if (node.type !== "step" || disabled || savingRef.current) return;
    setSelectedEdge(undefined);
    if (tool !== "connect") return;
    if (!source) { setSource(node); return; }
    if (source.id === node.id) { setSource(undefined); return; }
    if (source.data.flowId !== node.data.flowId) {
      setError("Choose two nodes in the same diagram.");
      return;
    }
    setSource(undefined);
    void save({ type: "connect", flowId: node.data.flowId, source: source.data.stepId, target: node.data.stepId });
  }
  function changeNodes(changes: NodeChange<CanvasNode>[]) {
    const allowed = disabled || savingRef.current ? changes.filter((change) => change.type !== "position") : changes;
    setNodes((current) => applyNodeChanges(allowed, current));
    for (const change of allowed) {
      if (change.type !== "position" || !change.position) continue;
      const node = nodes.find((candidate) => candidate.id === change.id);
      if (node?.type !== "step") continue;
      const flow = latest.current.flows.find((entry) => entry.id === node.data.flowId);
      const saved = flow && getFlowCanvasBoard(flow, latest.current.canvas).positions.find((entry) => entry.stepId === node.data.stepId);
      if (!saved) continue;
      if (change.dragging) {
        if (!dragStarts.current.has(node.id)) dragStarts.current.set(node.id, { x: saved.x, y: saved.y });
        continue;
      }
      const from = dragStarts.current.get(node.id) ?? saved;
      dragStarts.current.delete(node.id);
      if (from.x === change.position.x && from.y === change.position.y) continue;
      void save({ type: "move", flowId: node.data.flowId, stepId: node.data.stepId, from: { x: from.x, y: from.y }, to: { x: Math.round(Math.max(0, change.position.x)), y: Math.round(Math.max(0, change.position.y)) } });
    }
  }
  function unlinkSelected() {
    if (!selectedEdge?.data || disabled || savingRef.current) return;
    void save({ type: "disconnect", ...selectedEdge.data });
    setUnlinkMenu(undefined);
    setSelectedEdge(undefined);
  }
  function openDetails(node: CanvasNode, anchor: HTMLElement) {
    if (node.type !== "step" || tool !== "select") return;
    setSelectedEdge(undefined);
    setDetails({ flowId: node.data.flowId, stepId: node.data.stepId, anchor });
  }
  const detailsStep = latest.current.flows.find((flow) => flow.id === details?.flowId)?.steps.find((step) => step.id === details?.stepId);
  const detailsScreen = detailsStep ? findStepScreen(detailsStep, latest.current.screens) : undefined;
  const busy = disabled || saving;
  return <div className="flows-canvas" aria-label={`${label} canvas`} onKeyDown={(event) => {
    if (event.key === "Escape") { setSource(undefined); setSelectedEdge(undefined); setTool("select"); }
    if ((event.key === "Delete" || event.key === "Backspace") && selectedEdge?.data && !busy) {
      if (event.target instanceof HTMLElement && (event.target.isContentEditable || event.target.closest("input, textarea, select"))) return;
      event.preventDefault();
      unlinkSelected();
    }
    if (event.key === "Enter") {
      const anchor = (event.target as HTMLElement).closest<HTMLElement>(".react-flow__node-step");
      const node = nodes.find((entry) => entry.id === anchor?.getAttribute("data-id"));
      if (node && anchor) {
        event.preventDefault();
        if (tool === "connect") chooseNode(node);
        else openDetails(node, anchor);
      }
    }
  }}>
    <ReactFlow<CanvasNode, CanvasEdge>
      nodes={nodes.map((node) => node.type === "step" ? { ...node, data: { ...node.data, highlighted: node.id === source?.id || node.id === selectedEdge?.source || node.id === selectedEdge?.target } } : node)}
      edges={edges.map((edge) => {
        const selected = edge.id === selectedEdge?.id;
        return { ...edge, selected };
      })}
      nodeTypes={nodeTypes} onNodesChange={changeNodes} ariaLabelConfig={ariaLabelConfig}
      onNodeClick={(_, node) => chooseNode(node)}
      onNodeDoubleClick={(event, node) => { if (event.currentTarget instanceof HTMLElement) openDetails(node, event.currentTarget); }}
      zoomOnDoubleClick={false}
      onEdgeClick={(_, edge) => { setUnlinkMenu(undefined); setSelectedEdge(edge); setSource(undefined); }}
      onEdgeContextMenu={(event, edge) => {
        event.preventDefault();
        if (busy || !(event.currentTarget instanceof SVGElement)) return;
        setSelectedEdge(edge);
        setSource(undefined);
        setUnlinkMenu({ x: event.clientX, y: event.clientY, anchor: event.currentTarget });
      }}
      onEdgesChange={(changes) => {
        if (busy) return;
        for (const change of changes) {
          if (change.type !== "select") continue;
          if (change.selected) setSource(undefined);
          setSelectedEdge((current) => change.selected ? edges.find((edge) => edge.id === change.id) : current?.id === change.id ? undefined : current);
        }
      }}
      onPaneClick={() => { setSource(undefined); setSelectedEdge(undefined); }}
      nodesDraggable={!busy && tool === "select"} nodesConnectable={false}
      edgesFocusable={!busy} deleteKeyCode={null} selectionOnDrag={false} selectionKeyCode={null} multiSelectionKeyCode={null}
      minZoom={0.25} maxZoom={2} fitView fitViewOptions={{ padding: 0.22, maxZoom: 0.75 }}
      proOptions={{ hideAttribution: true }}
    >
      <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#C4C4C4" />
      {actions ? <Panel position="top-right" className="flows-canvas-actions">{actions}</Panel> : null}
      <Panel position="top-left" className={`flows-canvas-message${!saving && !disabled && tool === "select" && !error && !selectedEdge ? " is-idle" : ""}`}>
        <p role="status">{saving ? "Saving diagram…" : disabled ? "Generation in progress — editing paused" : tool === "connect" ? source ? "Choose the node to connect to. Escape cancels." : "Choose the first node, then the second." : "Select and drag nodes. Use the toolbar to connect them."}</p>
        {error ? <p role="alert" className="flows-canvas-error">{error}</p> : null}
        {selectedEdge?.data ? <button type="button" disabled={busy} className="flows-canvas-remove" onClick={unlinkSelected}>Remove selected connection</button> : null}
      </Panel>
      <Panel position="bottom-center" className="flows-canvas-toolbar" role="toolbar" aria-label="Diagram tools">
        <CanvasButton label="Select nodes" icon="select" active={tool === "select"} disabled={busy} onClick={() => { setTool("select"); setSource(undefined); }} />
        <span className="flows-canvas-toolbar-divider" />
        <button type="button" title="Connect nodes" aria-label="Connect nodes" aria-pressed={tool === "connect"} disabled={busy} className={`flows-canvas-tool${tool === "connect" ? " is-active" : ""}`} onClick={() => { setTool("connect"); setSource(undefined); setError(undefined); }}><Graph size={20} aria-hidden="true" /></button>
        <CanvasButton label="Add diagram" icon="add" disabled={busy} onClick={onAdd} />
      </Panel>
      <Panel position="bottom-right" className="flows-canvas-controls" role="group" aria-label="Zoom and chat">
        <CanvasButton label="Zoom in" icon="zoom-in" onClick={() => void zoomIn()} />
        <CanvasButton label="Zoom out" icon="zoom-out" onClick={() => void zoomOut()} />
        <CanvasButton label="Open Stage chat" icon="chat" onClick={() => window.dispatchEvent(new CustomEvent(STAGE_CHAT_OPEN_REQUEST))} />
      </Panel>
    </ReactFlow>
    {unlinkMenu && selectedEdge?.data ? <Dialog.Root open modal={false} onOpenChange={(open) => { if (!open) setUnlinkMenu(undefined); }}>
      <Dialog.Portal>
        <Dialog.Content className="flows-canvas-unlink-menu" style={{ left: Math.max(8, Math.min(unlinkMenu.x, window.innerWidth - 188)), top: Math.max(8, Math.min(unlinkMenu.y, window.innerHeight - 52)) }} onEscapeKeyDown={(event) => event.stopPropagation()} onCloseAutoFocus={(event) => {
          event.preventDefault();
          if (unlinkMenu.anchor.isConnected) unlinkMenu.anchor.focus({ preventScroll: true });
        }}>
          <Dialog.Title className="sr-only">Connection actions</Dialog.Title>
          <Dialog.Description className="sr-only">{selectedEdge.ariaLabel}. Unlink removes only this connection, not either page or step.</Dialog.Description>
          <button type="button" disabled={busy} onClick={unlinkSelected}><LinkBreak size={16} aria-hidden="true" />Unlink</button>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root> : null}
    {details && detailsStep ? <ScreenDetailsDialog key={nodeId(details.flowId, details.stepId)} nodeLabel={detailsStep.label} screen={detailsScreen} disabled={busy} anchor={details.anchor} onClose={() => setDetails(undefined)} onSave={(change) => onSaveScreen(details.flowId, details.stepId, change)} /> : null}
  </div>;
}

function CanvasButton({ label, icon, active, disabled, onClick }: { label: string; icon: string; active?: boolean; disabled?: boolean; onClick: () => void }) {
  return <button type="button" title={label} aria-label={label} aria-pressed={active} disabled={disabled} onClick={onClick} className={`flows-canvas-tool${active ? " is-active" : ""}${icon === "chat" ? " is-chat" : ""}`}><img src={`/logos/flows/${icon}.svg`} alt="" aria-hidden="true" /></button>;
}
