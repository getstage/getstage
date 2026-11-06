import { Background, BackgroundVariant, Panel, ReactFlow, ReactFlowProvider, useReactFlow } from "@xyflow/react";
import type { FlowsArtifact, ProjectCategory } from "@stage/data-ops/contracts";
import { ariaLabelConfig, buildElements, CanvasButton, nodeTypes, type CanvasEdge, type CanvasNode } from "./canvasElements";

// The Flows / Sitemap canvas without editing: pan, zoom and fit, same look as the Mac canvas.
export function FlowsCanvasView(props: { artifact: FlowsArtifact; projectCategory: ProjectCategory }) {
  return <ReactFlowProvider><ReadOnlyCanvas {...props} /></ReactFlowProvider>;
}

function ReadOnlyCanvas({ artifact, projectCategory }: { artifact: FlowsArtifact; projectCategory: ProjectCategory }) {
  const label = projectCategory === "websites" ? "Sitemap" : "Flows";
  const { nodes, edges } = buildElements(artifact, label);
  const { zoomIn, zoomOut } = useReactFlow<CanvasNode, CanvasEdge>();

  return (
    <div className="flows-canvas" aria-label={`${label} canvas`}>
      <ReactFlow<CanvasNode, CanvasEdge>
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        ariaLabelConfig={ariaLabelConfig}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        minZoom={0.25}
        maxZoom={2}
        fitView
        fitViewOptions={{ padding: 0.22, maxZoom: 0.75 }}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#C4C4C4" />
        <Panel position="bottom-right" className="flows-canvas-controls" role="group" aria-label="Zoom">
          <CanvasButton label="Zoom in" icon="zoom-in" onClick={() => void zoomIn()} />
          <CanvasButton label="Zoom out" icon="zoom-out" onClick={() => void zoomOut()} />
        </Panel>
      </ReactFlow>
    </div>
  );
}
