import { figJamCanvasWritePlanSchema, type FigJamCanvasWritePlan } from "../../../packages/data-ops/src/contracts/figma-export";
import { getFlowCanvasBoardSize, getFlowCanvasNodeWidth } from "../../../packages/data-ops/src/domain/flows-canvas";

export async function executeFigJamCanvasWritePlan(input: FigJamCanvasWritePlan, created: SceneNode[]) {
  if (figma.editorType !== "figjam") throw new Error("Open a FigJam board before running this export.");
  const plan = figJamCanvasWritePlanSchema.parse(input);
  await figma.loadFontAsync({ family: "Inter", style: "Regular" });
  const root = figma.createSection();
  created.push(root);
  root.name = plan.name;
  root.x = figma.viewport.center.x;
  root.y = figma.viewport.center.y;
  const boards = new Map(plan.canvas.boards.map((board) => [board.flowId, board]));
  let top = 40;
  let width = 880;
  for (const flow of plan.flows) {
    const board = boards.get(flow.id)!; // Validated membership before creating any nodes.
    const size = getFlowCanvasBoardSize(board);
    const section = figma.createSection();
    created.push(section);
    root.appendChild(section);
    section.name = flow.title;
    section.setPluginData("stageFlowId", flow.id);
    section.x = 40;
    section.y = top;
    section.resizeWithoutConstraints(size.width, size.height);
    section.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
    const positions = new Map(board.positions.map((position) => [position.stepId, position]));
    const nodes = new Map<string, ShapeWithTextNode>();
    for (const step of flow.steps) {
      const position = positions.get(step.id)!;
      const node = figma.createShapeWithText();
      created.push(node);
      section.appendChild(node);
      node.name = step.label;
      node.setPluginData("stageStepId", step.id);
      node.shapeType = "ROUNDED_RECTANGLE";
      const nodeWidth = getFlowCanvasNodeWidth(step.label);
      node.resize(nodeWidth, Math.max(38, Math.ceil(step.label.length * 7 / (nodeWidth - 24)) * 18 + 20));
      node.x = position.x;
      node.y = position.y;
      node.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
      node.strokes = [{ type: "SOLID", color: { r: 0.898, g: 0.898, b: 0.898 } }];
      node.strokeWeight = 1;
      node.text.fontName = { family: "Inter", style: "Regular" };
      node.text.fontSize = 13;
      node.text.characters = step.label;
      nodes.set(step.id, node);
    }
    for (const edge of board.edges) {
      const connector = figma.createConnector();
      created.push(connector);
      section.appendChild(connector);
      connector.name = `${edge.source} → ${edge.target}`;
      connector.connectorStart = { endpointNodeId: nodes.get(edge.source)!.id, magnet: "BOTTOM" };
      connector.connectorEnd = { endpointNodeId: nodes.get(edge.target)!.id, magnet: "TOP" };
      connector.connectorLineType = "ELBOWED";
      connector.connectorStartStrokeCap = "NONE";
      connector.connectorEndStrokeCap = "ARROW_LINES";
      connector.strokes = [{ type: "SOLID", color: { r: 0.322, g: 0.322, b: 0.322 } }];
      connector.strokeWeight = 1.25;
    }
    width = Math.max(width, size.width);
    top += size.height + 100;
  }
  root.resizeWithoutConstraints(width + 80, Math.max(120, top));
  return { root, nodes: created };
}
