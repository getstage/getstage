import { useEffect, useRef, useState, type ReactNode } from "react";
import { Graph, LinkBreak, PlusSquare, Trash, TreeStructure } from "@phosphor-icons/react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  Background, BackgroundVariant, Panel, ReactFlow, ReactFlowProvider, applyNodeChanges, useReactFlow, type NodeChange,
} from "@xyflow/react";
import type { FlowsArtifact, FlowsCanvasEdit, ProjectCategory } from "@stage/data-ops/contracts";
import { flowLayoutDirection, getFlowCanvasBoard } from "@stage/data-ops/domain";
import {
  ariaLabelConfig, buildElements, CanvasButton, findStepScreen, nodeId, nodeTypes,
  type CanvasEdge, type CanvasNode, type StepNode,
} from "@stage/project-ui/flows";
import { STAGE_CHAT_OPEN_REQUEST } from "@/lib/companion/shortcutEvents";
import { ScreenDetailsDialog, type ScreenDetailsChange } from "./ScreenDetailsDialog";

type CanvasMenu = { x: number; y: number; anchor: HTMLElement | SVGElement; target: { kind: "edge"; edge: CanvasEdge } | { kind: "node"; node: StepNode } };
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
export function FlowsCanvas(props: Props) {
  return <ReactFlowProvider><CanvasWorkspace {...props} /></ReactFlowProvider>;
}

function CanvasWorkspace({ artifact, updatedAt, projectCategory, disabled = false, onAdd, actions, onEdit, onSaveScreen }: Props) {
  const label = projectCategory === "websites" ? "Sitemap" : "Flows";
  const stepNoun = projectCategory === "websites" ? "page" : "screen";
  const direction = flowLayoutDirection(projectCategory);
  const [nodes, setNodes] = useState(() => buildElements(artifact, label).nodes);
  const [edges, setEdges] = useState(() => buildElements(artifact, label).edges);
  const [tool, setTool] = useState<"select" | "connect">("select");
  const [source, setSource] = useState<StepNode | undefined>();
  const [selectedEdge, setSelectedEdge] = useState<CanvasEdge | undefined>();
  const [menu, setMenu] = useState<CanvasMenu>();
  const [details, setDetails] = useState<{ flowId: string; stepId: string; anchor: HTMLElement; isNew?: boolean }>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const savingRef = useRef(false);
  const committedAt = useRef(updatedAt);
  const latest = useRef(artifact);
  const dragStarts = useRef(new Map<string, { x: number; y: number }>());
  const { zoomIn, zoomOut, fitView } = useReactFlow<CanvasNode, CanvasEdge>();

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
    setMenu(undefined);
    setSource((current) => current && elements.nodes.some((node) => node.id === current.id) ? current : undefined);
    setSelectedEdge((current) => current && elements.edges.some((edge) => edge.id === current.id) ? current : undefined);
  }, [artifact, updatedAt, label]);

  async function save(edit: FlowsCanvasEdit) {
    if (disabled || savingRef.current) return false;
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
      return true;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save the diagram.");
      hydrate(latest.current);
      return false;
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
    setMenu(undefined);
    setSelectedEdge(undefined);
  }
  function deleteNode(node: StepNode) {
    if (busy) return;
    setMenu(undefined);
    setDetails(undefined);
    void save({ type: "removeStep", flowId: node.data.flowId, stepId: node.data.stepId });
  }
  // A new node goes after the selected one (below it in a sitemap, to its right for
  // screens) and is linked from it; with nothing selected it starts a new branch.
  async function addStep() {
    if (busy) return;
    const selected = nodes.find((node): node is StepNode => node.type === "step" && !!node.selected);
    const flow = latest.current.flows.find((entry) => entry.id === selected?.data.flowId) ?? latest.current.flows[0];
    if (!flow) return;
    const board = getFlowCanvasBoard(flow, latest.current.canvas);
    const anchorPosition = selected ? board.positions.find((entry) => entry.stepId === selected.data.stepId) : undefined;
    const lowest = board.positions.reduce((max, entry) => Math.max(max, entry.y), 0);
    const position = anchorPosition
      ? direction === "vertical" ? { x: anchorPosition.x, y: anchorPosition.y + 120 } : { x: anchorPosition.x + 248, y: anchorPosition.y }
      : { x: 48, y: board.positions.length ? lowest + 120 : 72 };
    const stepId = `${stepNoun}-${crypto.randomUUID().slice(0, 8)}`;
    const added = await save({ type: "addStep", flowId: flow.id, stepId, label: `New ${stepNoun}`, position: { x: Math.min(position.x, 9800), y: Math.min(position.y, 9800) }, ...(selected ? { after: selected.data.stepId } : {}) });
    if (!added) return;
    requestAnimationFrame(() => {
      const element = document.querySelector<HTMLElement>(`.react-flow__node[data-id="${CSS.escape(nodeId(flow.id, stepId))}"]`);
      if (element) setDetails({ flowId: flow.id, stepId, anchor: element, isNew: true });
    });
  }
  async function arrange() {
    for (const flow of latest.current.flows) {
      if (!(await save({ type: "arrange", flowId: flow.id, direction }))) return;
    }
    void fitView({ padding: 0.22, maxZoom: 0.75, duration: 200 });
  }
  function openDetails(node: CanvasNode, anchor: HTMLElement) {
    if (node.type !== "step" || tool !== "select") return;
    setSelectedEdge(undefined);
    setDetails({ flowId: node.data.flowId, stepId: node.data.stepId, anchor });
  }
  const detailsStep = latest.current.flows.find((flow) => flow.id === details?.flowId)?.steps.find((step) => step.id === details?.stepId);
  const detailsScreen = detailsStep ? findStepScreen(detailsStep, latest.current.screens) : undefined;
  const busy = disabled || saving;
  const menuNode = menu?.target.kind === "node" ? menu.target.node : undefined;
  return <div className="flows-canvas" aria-label={`${label} canvas`} onKeyDown={(event) => {
    if (event.key === "Escape") { setSource(undefined); setSelectedEdge(undefined); setTool("select"); }
    if ((event.key === "Delete" || event.key === "Backspace") && !busy && !details) {
      if (event.target instanceof HTMLElement && (event.target.isContentEditable || event.target.closest("input, textarea, select"))) return;
      const selectedNode = nodes.find((node): node is StepNode => node.type === "step" && !!node.selected);
      if (selectedEdge?.data) {
        event.preventDefault();
        unlinkSelected();
      } else if (selectedNode) {
        event.preventDefault();
        deleteNode(selectedNode);
      }
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
      onEdgeClick={(_, edge) => { setMenu(undefined); setSelectedEdge(edge); setSource(undefined); }}
      onEdgeContextMenu={(event, edge) => {
        event.preventDefault();
        if (busy || !(event.currentTarget instanceof SVGElement)) return;
        setSelectedEdge(edge);
        setSource(undefined);
        setMenu({ x: event.clientX, y: event.clientY, anchor: event.currentTarget, target: { kind: "edge", edge } });
      }}
      onNodeContextMenu={(event, node) => {
        event.preventDefault();
        if (busy || node.type !== "step" || !(event.currentTarget instanceof HTMLElement)) return;
        setSelectedEdge(undefined);
        setSource(undefined);
        setNodes((current) => current.map((entry) => ({ ...entry, selected: entry.id === node.id })));
        setMenu({ x: event.clientX, y: event.clientY, anchor: event.currentTarget, target: { kind: "node", node } });
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
        <p role="status">{saving ? "Saving diagram…" : disabled ? "Generation in progress — editing paused" : tool === "connect" ? source ? "Choose the node to connect to. Escape cancels." : "Choose the first node, then the second." : `Select and drag nodes. Use the toolbar to connect them or add a ${stepNoun}.`}</p>
        {error ? <p role="alert" className="flows-canvas-error">{error}</p> : null}
        {selectedEdge?.data ? <button type="button" disabled={busy} className="flows-canvas-remove" onClick={unlinkSelected}>Remove selected connection</button> : null}
      </Panel>
      <Panel position="bottom-center" className="flows-canvas-toolbar" role="toolbar" aria-label="Diagram tools">
        <CanvasButton label="Select nodes" icon="select" active={tool === "select"} disabled={busy} onClick={() => { setTool("select"); setSource(undefined); }} />
        <span className="flows-canvas-toolbar-divider" />
        <button type="button" data-tooltip="Connect nodes" aria-label="Connect nodes" aria-pressed={tool === "connect"} disabled={busy} className={`flows-canvas-tool${tool === "connect" ? " is-active" : ""}`} onClick={() => { setTool("connect"); setSource(undefined); setError(undefined); }}><Graph size={20} aria-hidden="true" /></button>
        <button type="button" data-tooltip={`Add ${stepNoun}`} aria-label={`Add ${stepNoun}`} disabled={busy} className="flows-canvas-tool" onClick={() => void addStep()}><PlusSquare size={20} aria-hidden="true" /></button>
        <button type="button" data-tooltip="Arrange automatically" aria-label="Arrange automatically" disabled={busy} className="flows-canvas-tool" onClick={() => void arrange()}><TreeStructure size={20} aria-hidden="true" className={direction === "horizontal" ? "-rotate-90" : undefined} /></button>
        <span className="flows-canvas-toolbar-divider" />
        <CanvasButton label="Add diagram" icon="add" disabled={busy} onClick={onAdd} />
      </Panel>
      <Panel position="bottom-right" className="flows-canvas-controls" role="group" aria-label="Zoom and chat">
        <CanvasButton label="Zoom in" icon="zoom-in" onClick={() => void zoomIn()} />
        <CanvasButton label="Zoom out" icon="zoom-out" onClick={() => void zoomOut()} />
        <CanvasButton label="Open Stage chat" icon="chat" onClick={() => window.dispatchEvent(new CustomEvent(STAGE_CHAT_OPEN_REQUEST))} />
      </Panel>
    </ReactFlow>
    {menu ? <Dialog.Root open modal={false} onOpenChange={(open) => { if (!open) setMenu(undefined); }}>
      <Dialog.Portal>
        <Dialog.Content className="flows-canvas-unlink-menu" style={{ left: Math.max(8, Math.min(menu.x, window.innerWidth - 188)), top: Math.max(8, Math.min(menu.y, window.innerHeight - 52)) }} onEscapeKeyDown={(event) => event.stopPropagation()} onCloseAutoFocus={(event) => {
          event.preventDefault();
          if (menu.anchor.isConnected) menu.anchor.focus({ preventScroll: true });
        }}>
          {menu.target.kind === "edge" ? <>
            <Dialog.Title className="sr-only">Connection actions</Dialog.Title>
            <Dialog.Description className="sr-only">{`${menu.target.edge.ariaLabel}. Deleting the link keeps both ${stepNoun}s.`}</Dialog.Description>
            <button type="button" disabled={busy} onClick={unlinkSelected}><LinkBreak size={16} aria-hidden="true" />Delete link</button>
          </> : <>
            <Dialog.Title className="sr-only">{`${menu.target.node.data.label} actions`}</Dialog.Title>
            <Dialog.Description className="sr-only">{`Deletes this ${stepNoun} and its links.`}</Dialog.Description>
            <button type="button" disabled={busy} onClick={() => { if (menuNode) deleteNode(menuNode); }}><Trash size={16} aria-hidden="true" />{`Delete ${stepNoun}`}</button>
          </>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root> : null}
    {details && detailsStep ? <ScreenDetailsDialog key={nodeId(details.flowId, details.stepId)} nodeLabel={detailsStep.label} startEditing={details.isNew} screen={detailsScreen} disabled={busy} anchor={details.anchor} onClose={() => setDetails(undefined)} onSave={(change) => onSaveScreen(details.flowId, details.stepId, change)} /> : null}
  </div>;
}
