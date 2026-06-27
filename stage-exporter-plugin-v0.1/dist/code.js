"use strict";
(() => {
  // src/code.ts
  figma.showUI(__html__, { width: 360, height: 300, themeColors: true });
  figma.ui.onmessage = async (message) => {
    var _a;
    if (message.type !== "export" || !message.pairingCode) {
      return;
    }
    let claimToken = null;
    let createdNodes = [];
    let stopHeartbeat = null;
    try {
      const figmaUserId = (_a = figma.currentUser) == null ? void 0 : _a.id;
      if (!figmaUserId) {
        throw new Error("Stage Exporter needs permission to read the current Figma user.");
      }
      notifyUi("working", "Claiming Stage export...");
      const claim = await postJson("/api/v1/figma-export/claim", {
        pairingCode: message.pairingCode,
        figmaUserId,
        documentName: figma.root.name,
        editorType: figma.editorType
      });
      claimToken = claim.claimToken;
      stopHeartbeat = startHeartbeat(claim.claimToken);
      notifyUi(
        "working",
        claim.writePlan.kind === "figjam-flow-map" ? "Creating editable FigJam flow map..." : "Creating editable Figma layers..."
      );
      const execution = claim.writePlan.kind === "figjam-flow-map" ? await executeFigJamWritePlan(claim.writePlan) : await executeFigmaWritePlan(claim.writePlan);
      const root = execution.root;
      createdNodes = execution.nodes;
      const fileKey = figma.fileKey;
      const destinationUrl = fileKey ? `https://www.figma.com/${figma.editorType === "figjam" ? "board" : "design"}/${fileKey}?node-id=${root.id.replace(":", "-")}` : void 0;
      await postJson("/api/v1/figma-export/complete", {
        claimToken: claim.claimToken,
        destinationNodeId: root.id,
        destinationUrl
      });
      figma.currentPage.selection = [root];
      figma.viewport.scrollAndZoomIntoView([root]);
      notifyUi("success", "Stage export completed. You can close this plugin.");
    } catch (error) {
      var errorMessage = friendlyError(error instanceof Error ? error.message : "");
      for (var i = createdNodes.length - 1; i >= 0; i--) {
        if (!createdNodes[i].removed) createdNodes[i].remove();
      }
      if (claimToken) {
        try {
          await postJson("/api/v1/figma-export/fail", {
            claimToken,
            errorMessage
          });
        } catch (e) {
        }
      }
      notifyUi("error", errorMessage);
    } finally {
      if (stopHeartbeat) stopHeartbeat();
    }
  };
  function friendlyError(rawMessage) {
    if (!rawMessage) return "Something went wrong. Please try the export again from Stage.";
    var msg = rawMessage.toLowerCase();
    if (msg.indexOf("open a figjam board") !== -1) {
      return "This export needs a FigJam board. Open a FigJam board in Figma and run the plugin again.";
    }
    if (msg.indexOf("open a figma design file") !== -1) {
      return "This export needs a Figma Design file. Open a Figma Design file (not FigJam) and run the plugin again.";
    }
    if (msg.indexOf("pairing code is invalid or expired") !== -1) {
      return "The pairing code expired. Click Send to FigJam in Stage to get a new code.";
    }
    if (msg.indexOf("same account") !== -1) {
      return "The Figma account in this file does not match the one connected to Stage. Reconnect Figma in Stage Settings.";
    }
    if (msg.indexOf("already completed") !== -1) {
      return "This export was already completed. Start a new export from Stage.";
    }
    if (msg.indexOf("connect figma") !== -1) {
      return "Figma is not connected. Connect Figma in Stage Settings before exporting.";
    }
    if (msg.indexOf("artifact") !== -1 || msg.indexOf("flows") !== -1 || msg.indexOf("wireframe") !== -1) {
      return "The project content could not be found. Regenerate it in Stage and try again.";
    }
    return "The export could not be completed. Please try again from Stage.";
  }
  async function executeFigmaWritePlan(plan) {
    if (figma.editorType !== "figma") {
      throw new Error("Open a Figma Design file for this wireframe export.");
    }
    await Promise.all([
      figma.loadFontAsync({ family: "Inter", style: "Regular" }),
      figma.loadFontAsync({ family: "Inter", style: "Semi Bold" })
    ]);
    const root = figma.createFrame();
    root.name = plan.name;
    root.layoutMode = "VERTICAL";
    root.primaryAxisSizingMode = "AUTO";
    root.counterAxisSizingMode = "FIXED";
    root.resize(plan.width, 100);
    root.itemSpacing = 24;
    root.paddingTop = 32;
    root.paddingRight = 32;
    root.paddingBottom = 32;
    root.paddingLeft = 32;
    root.fills = [{ type: "SOLID", color: rgb("#F5F5F5") }];
    for (const sectionPlan of plan.sections) {
      const section = figma.createFrame();
      section.name = sectionPlan.title;
      section.layoutMode = "VERTICAL";
      section.primaryAxisSizingMode = "AUTO";
      section.counterAxisSizingMode = "FIXED";
      section.resize(plan.width - 64, 100);
      section.itemSpacing = 8;
      section.paddingTop = 16;
      section.paddingRight = 16;
      section.paddingBottom = 16;
      section.paddingLeft = 16;
      section.cornerRadius = 8;
      section.fills = [{ type: "SOLID", color: rgb("#E5E5E5") }];
      root.appendChild(section);
      const title = figma.createText();
      title.name = `${sectionPlan.title} label`;
      title.fontName = { family: "Inter", style: "Semi Bold" };
      title.fontSize = 14;
      title.characters = sectionPlan.title;
      title.fills = [{ type: "SOLID", color: rgb("#171717") }];
      section.appendChild(title);
      for (const blockPlan of sectionPlan.blocks) {
        const block = figma.createFrame();
        block.name = `${blockPlan.kind}: ${blockPlan.label}`;
        block.layoutMode = "HORIZONTAL";
        block.primaryAxisAlignItems = "SPACE_BETWEEN";
        block.counterAxisAlignItems = "CENTER";
        block.counterAxisSizingMode = "FIXED";
        block.resize(plan.width - 96, blockPlan.height);
        block.paddingLeft = 20;
        block.paddingRight = 20;
        block.cornerRadius = 6;
        block.fills = [{ type: "SOLID", color: rgb("#FFFFFF") }];
        block.strokes = [{ type: "SOLID", color: rgb("#D4D4D4") }];
        section.appendChild(block);
        const label = figma.createText();
        label.fontName = { family: "Inter", style: "Semi Bold" };
        label.fontSize = 16;
        label.characters = blockPlan.label;
        label.fills = [{ type: "SOLID", color: rgb("#262626") }];
        block.appendChild(label);
        const kind = figma.createText();
        kind.fontName = { family: "Inter", style: "Regular" };
        kind.fontSize = 11;
        kind.characters = blockPlan.kind.toUpperCase();
        kind.fills = [{ type: "SOLID", color: rgb("#737373") }];
        block.appendChild(kind);
      }
    }
    return { root, nodes: [root] };
  }
  async function executeFigJamWritePlan(plan) {
    if (figma.editorType !== "figjam") {
      throw new Error("Open a FigJam board for this flow-map export.");
    }
    await figma.loadFontAsync({ family: "Inter", style: "Regular" });
    const created = [];
    const title = figma.createShapeWithText();
    title.name = plan.name;
    title.shapeType = "ROUNDED_RECTANGLE";
    title.resize(360, 90);
    title.x = 0;
    title.y = 0;
    title.text.characters = plan.name;
    title.text.fontSize = 24;
    created.push(title);
    let y = 150;
    for (const flow of plan.flows) {
      const flowLabel = figma.createShapeWithText();
      flowLabel.name = flow.title;
      flowLabel.shapeType = "ROUNDED_RECTANGLE";
      flowLabel.resize(260, 100);
      flowLabel.x = 0;
      flowLabel.y = y;
      flowLabel.text.characters = `${flow.title}
${flow.description}`;
      created.push(flowLabel);
      let previous = flowLabel;
      let x = 340;
      for (const step of flow.steps) {
        const stepNode = figma.createShapeWithText();
        stepNode.name = step.label;
        stepNode.shapeType = "ROUNDED_RECTANGLE";
        stepNode.resize(220, 80);
        stepNode.x = x;
        stepNode.y = y + 10;
        stepNode.text.characters = step.label;
        created.push(stepNode);
        const connector = figma.createConnector();
        connector.name = `${previous.name} -> ${stepNode.name}`;
        connector.connectorStart = { endpointNodeId: previous.id, magnet: "AUTO" };
        connector.connectorEnd = { endpointNodeId: stepNode.id, magnet: "AUTO" };
        created.push(connector);
        previous = stepNode;
        x += 280;
      }
      y += 180;
    }
    figma.currentPage.selection = created;
    figma.viewport.scrollAndZoomIntoView(created);
    return { root: title, nodes: created };
  }
  function startHeartbeat(claimToken) {
    const timer = setInterval(() => {
      void postJson("/api/v1/figma-export/heartbeat", { claimToken }).catch(() => {
      });
    }, 6e4);
    return () => clearInterval(timer);
  }
  async function postJson(path, body) {
    var _a, _b;
    const response = await fetch(`${"https://reliable-bullfrog-917.convex.site"}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error((_b = (_a = payload.error) == null ? void 0 : _a.message) != null ? _b : `Stage export request failed (${response.status}).`);
    }
    return payload;
  }
  function notifyUi(status, message) {
    figma.ui.postMessage({ status, message });
  }
  function rgb(hex) {
    const value = Number.parseInt(hex.slice(1), 16);
    return {
      r: (value >> 16 & 255) / 255,
      g: (value >> 8 & 255) / 255,
      b: (value & 255) / 255
    };
  }
})();
