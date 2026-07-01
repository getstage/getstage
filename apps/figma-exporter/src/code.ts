type FigmaWritePlan = {
  apiVersion: "v1";
  kind: "wireframe";
  name: string;
  width: number;
  sections: Array<{
    id: string;
    title: string;
    blocks: Array<{
      id: string;
      kind: string;
      label: string;
      height: number;
    }>;
  }>;
};

type HifiFigmaWritePlan = {
  apiVersion: "v1";
  kind: "hifi-wireframe";
  name: string;
  width: number;
  height: number;
  imageUrl: string;
};

type FigmaDomNode =
  | {
      type: "rect";
      x: number;
      y: number;
      w: number;
      h: number;
      fill?: string;
      radius?: number;
      strokeColor?: string;
      strokeWeight?: number;
    }
  | {
      type: "text";
      x: number;
      y: number;
      w: number;
      text: string;
      fontSize: number;
      fontFamily: string;
      fontWeight: number;
      color: string;
      align: string;
      lineHeight?: number;
      multiline?: boolean;
    }
  | {
      type: "image";
      x: number;
      y: number;
      w: number;
      h: number;
      url: string;
      radius?: number;
      fit?: string;
    };

type NodesFigmaWritePlan = {
  apiVersion: "v1";
  kind: "hifi-wireframe-nodes";
  name: string;
  width: number;
  height: number;
  nodes: FigmaDomNode[];
};

type FigJamWritePlan = {
  apiVersion: "v1";
  kind: "figjam-flow-map";
  name: string;
  flows: Array<{
    id: string;
    title: string;
    description: string;
    steps: Array<{ id: string; label: string }>;
  }>;
};

type CanvasWritePlan =
  | FigmaWritePlan
  | HifiFigmaWritePlan
  | NodesFigmaWritePlan
  | FigJamWritePlan;

type ClaimResponse = {
  jobId: string;
  claimToken: string;
  writePlan: CanvasWritePlan;
};

figma.showUI(__html__, { width: 360, height: 300, themeColors: true });

figma.ui.onmessage = async (message: { type?: string; pairingCode?: string }) => {
  if (message.type !== "export" || !message.pairingCode) {
    return;
  }

  let claimToken: string | null = null;
  let createdNodes: SceneNode[] = [];
  let stopHeartbeat: (() => void) | null = null;

  try {
    const figmaUserId = figma.currentUser?.id;
    if (!figmaUserId) {
      throw new Error("Stage Exporter needs permission to read the current Figma user.");
    }

    notifyUi("working", "Claiming Stage export...");
    const claim = await postJson<ClaimResponse>("/api/v1/figma-export/claim", {
      pairingCode: message.pairingCode,
      figmaUserId,
      documentName: figma.root.name,
      editorType: figma.editorType,
    });
    claimToken = claim.claimToken;
    stopHeartbeat = startHeartbeat(claim.claimToken);
    notifyUi(
      "working",
      claim.writePlan.kind === "figjam-flow-map"
        ? "Creating editable FigJam flow map..."
        : claim.writePlan.kind === "hifi-wireframe"
          ? "Placing Hi-Fi wireframe image..."
          : "Creating editable Figma layers...",
    );

    const execution =
      claim.writePlan.kind === "figjam-flow-map"
        ? await executeFigJamWritePlan(claim.writePlan)
        : claim.writePlan.kind === "hifi-wireframe"
          ? await executeHifiFigmaWritePlan(claim.writePlan)
          : claim.writePlan.kind === "hifi-wireframe-nodes"
            ? await executeNodesFigmaWritePlan(claim.writePlan)
            : await executeFigmaWritePlan(claim.writePlan);
    const root = execution.root;
    createdNodes = execution.nodes;
    const fileKey = figma.fileKey;
    const destinationUrl = fileKey
      ? `https://www.figma.com/${figma.editorType === "figjam" ? "board" : "design"}/${fileKey}?node-id=${root.id.replace(":", "-")}`
      : undefined;

    await postJson("/api/v1/figma-export/complete", {
      claimToken: claim.claimToken,
      destinationNodeId: root.id,
      destinationUrl,
    });
    figma.currentPage.selection = [root];
    figma.viewport.scrollAndZoomIntoView([root]);
    const fontWarning = "warning" in execution ? execution.warning : undefined;
    notifyUi(
      "success",
      fontWarning
        ? `Stage export completed. ${fontWarning}`
        : "Stage export completed. You can close this plugin.",
    );
  } catch (error) {
    var errorMessage = friendlyError(error instanceof Error ? error.message : "");
    for (var i = createdNodes.length - 1; i >= 0; i--) {
      if (!createdNodes[i].removed) createdNodes[i].remove();
    }
    if (claimToken) {
      try {
        await postJson("/api/v1/figma-export/fail", {
          claimToken: claimToken,
          errorMessage: errorMessage,
        });
      } catch (e) {
        // Keep the original canvas-write error visible to the user.
      }
    }
    notifyUi("error", errorMessage);
  } finally {
    if (stopHeartbeat) stopHeartbeat();
  }
};

function friendlyError(rawMessage: string): string {
  if (!rawMessage) return "Something went wrong. Please try the export again from Stage.";
  var msg = rawMessage.toLowerCase();
  if (msg.indexOf("open a figjam board") !== -1) {
    return "This export needs a FigJam board. Open a FigJam board in Figma and run the plugin again.";
  }
  if (msg.indexOf("open a figma design file") !== -1) {
    return "This export needs a Figma Design file. Open a Figma Design file (not FigJam) and run the plugin again.";
  }
  if (msg.indexOf("image") !== -1 || msg.indexOf("fetch") !== -1) {
    return "The Hi-Fi preview image could not be loaded. Republish the Stage Exporter plugin with the latest manifest, then try again.";
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

async function executeFigmaWritePlan(plan: FigmaWritePlan) {
  if (figma.editorType !== "figma") {
    throw new Error("Open a Figma Design file for this wireframe export.");
  }
  await Promise.all([
    figma.loadFontAsync({ family: "Inter", style: "Regular" }),
    figma.loadFontAsync({ family: "Inter", style: "Semi Bold" }),
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

async function executeHifiFigmaWritePlan(plan: HifiFigmaWritePlan) {
  if (figma.editorType !== "figma") {
    throw new Error("Open a Figma Design file for this wireframe export.");
  }

  const image = await figma.createImageAsync(plan.imageUrl);
  const root = figma.createFrame();
  root.name = plan.name;
  root.resize(plan.width, plan.height);
  root.clipsContent = true;
  root.fills = [
    {
      type: "IMAGE",
      imageHash: image.hash,
      scaleMode: "FILL",
    },
  ];

  return { root, nodes: [root] };
}

async function executeNodesFigmaWritePlan(plan: NodesFigmaWritePlan) {
  if (figma.editorType !== "figma") {
    throw new Error("Open a Figma Design file for this wireframe export.");
  }

  const nodes = Array.isArray(plan.nodes) ? plan.nodes.slice(0, 8000) : [];
  const root = figma.createFrame();
  root.name = plan.name;
  root.resize(clampSize(num(plan.width, 1440)), clampSize(num(plan.height, 1000)));
  root.clipsContent = true;
  root.fills = [{ type: "SOLID", color: rgb("#FFFFFF") }];

  // loadFontAsync must resolve before any text node's characters/size are set, so
  // resolve (with fallback) every text font up front and cache by family+style.
  const fontCache: { [key: string]: FontName } = {};
  const substitutedFonts = new Set<string>();
  for (const node of nodes) {
    if (node && node.type === "text") {
      await resolveFont(
        fontCache,
        substitutedFonts,
        String(node.fontFamily || "Inter"),
        num(node.fontWeight, 400),
      );
    }
  }

  for (const node of nodes) {
    if (!node || typeof node.type !== "string") continue;
    try {
      if (node.type === "rect") {
        const r = figma.createRectangle();
        r.resize(clampSize(num(node.w, 1)), clampSize(num(node.h, 1)));
        root.appendChild(r);
        r.x = num(node.x);
        r.y = num(node.y);
        r.cornerRadius = Math.max(0, num(node.radius, 0));
        r.fills = node.fill ? [{ type: "SOLID", color: rgb(node.fill) }] : [];
        if (node.strokeColor) {
          r.strokes = [{ type: "SOLID", color: rgb(node.strokeColor) }];
          r.strokeWeight = Math.max(1, num(node.strokeWeight, 1));
        }
      } else if (node.type === "image") {
        // Defense in depth behind the manifest allowlist and the walker's filter.
        if (typeof node.url !== "string" || node.url.indexOf("https://") !== 0) continue;
        const image = await figma.createImageAsync(node.url);
        const r = figma.createRectangle();
        r.resize(clampSize(num(node.w, 1)), clampSize(num(node.h, 1)));
        root.appendChild(r);
        r.x = num(node.x);
        r.y = num(node.y);
        r.cornerRadius = Math.max(0, num(node.radius, 0));
        r.fills = [
          { type: "IMAGE", imageHash: image.hash, scaleMode: node.fit === "FIT" ? "FIT" : "FILL" },
        ];
      } else if (node.type === "text") {
        const font = await resolveFont(
          fontCache,
          substitutedFonts,
          String(node.fontFamily || "Inter"),
          num(node.fontWeight, 400),
        );
        const t = figma.createText();
        t.fontName = font;
        t.fontSize = Math.max(1, num(node.fontSize, 16));
        // Match the design's line spacing; without this Figma's default line
        // height balloons wrapped headings and they overlap the next element.
        if (typeof node.lineHeight === "number" && node.lineHeight > 0) {
          t.lineHeight = { value: node.lineHeight, unit: "PIXELS" };
        }
        t.characters = String(node.text || "");
        root.appendChild(t);
        // Left-aligned single-line text grows horizontally instead of wrapping,
        // so a wider Figma font can't drop a phantom second line onto the element
        // beneath it. Wrapped/centred text keeps its fixed-width box.
        const leftAligned = !node.align || node.align === "left" || node.align === "start";
        if (node.multiline === false && leftAligned) {
          t.textAutoResize = "WIDTH_AND_HEIGHT";
        } else {
          t.textAutoResize = "HEIGHT";
          t.resize(clampSize(num(node.w, 1)), t.height);
        }
        t.x = num(node.x);
        t.y = num(node.y);
        t.fills = [{ type: "SOLID", color: rgb(node.color || "#171717") }];
        t.textAlignHorizontal =
          node.align === "center"
            ? "CENTER"
            : node.align === "right"
              ? "RIGHT"
              : node.align === "justify"
                ? "JUSTIFIED"
                : "LEFT";
      }
    } catch (e) {
      // A single unbuildable layer (bad font, unreachable image) must not abort
      // the whole export — skip it and keep the rest of the design intact.
    }
  }

  let warning: string | undefined;
  if (substitutedFonts.size > 0) {
    const list = Array.from(substitutedFonts).slice(0, 5).join(", ");
    const many = substitutedFonts.size > 1;
    warning = `${list} ${many ? "aren't" : "isn't"} installed in Figma — Inter was used instead. Install ${many ? "them" : "it"} in Figma for an exact match.`;
  }

  return { root, nodes: [root], warning };
}

function weightToStyle(weight: number): string {
  if (weight >= 700) return "Bold";
  if (weight >= 600) return "Semi Bold";
  if (weight >= 500) return "Medium";
  return "Regular";
}

// Resolves a usable, loaded font: the requested family first, then Inter at the
// same weight, then Inter Regular — so an arbitrary Google font the user's Figma
// lacks degrades gracefully instead of throwing.
async function resolveFont(
  cache: { [key: string]: FontName },
  substituted: Set<string>,
  family: string,
  weight: number,
): Promise<FontName> {
  const style = weightToStyle(weight);
  const key = `${family}|${style}`;
  if (cache[key]) return cache[key];
  // Requested (style-guide) font first; record it as substituted if unavailable
  // so the export can tell the user which fonts to install for an exact match.
  if (family && family !== "Inter") {
    try {
      const requested: FontName = { family, style };
      await figma.loadFontAsync(requested);
      cache[key] = requested;
      return requested;
    } catch (e) {
      substituted.add(family);
    }
  }
  const fallbacks: FontName[] = [
    { family: "Inter", style },
    { family: "Inter", style: "Regular" },
  ];
  for (const candidate of fallbacks) {
    try {
      await figma.loadFontAsync(candidate);
      cache[key] = candidate;
      return candidate;
    } catch (e) {
      // try the next fallback
    }
  }
  const fallback: FontName = { family: "Inter", style: "Regular" };
  await figma.loadFontAsync(fallback);
  cache[key] = fallback;
  return fallback;
}

function num(value: unknown, fallback = 0): number {
  return typeof value === "number" && isFinite(value) ? value : fallback;
}

function clampSize(value: number): number {
  return Math.max(1, Math.min(value, 100000));
}

async function executeFigJamWritePlan(plan: FigJamWritePlan) {
  if (figma.editorType !== "figjam") {
    throw new Error("Open a FigJam board for this flow-map export.");
  }

  await figma.loadFontAsync({ family: "Inter", style: "Regular" });
  const created: SceneNode[] = [];
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
    flowLabel.text.characters = `${flow.title}\n${flow.description}`;
    created.push(flowLabel);

    let previous: ShapeWithTextNode = flowLabel;
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

function startHeartbeat(claimToken: string) {
  const timer = setInterval(() => {
    void postJson("/api/v1/figma-export/heartbeat", { claimToken }).catch(() => {
      // Completion/failure reports remain authoritative; heartbeat is best effort.
    });
  }, 60_000);
  return () => clearInterval(timer);
}

async function postJson<T = unknown>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${__STAGE_API_BASE__}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await response.json()) as { error?: { message?: string } } & T;
  if (!response.ok) {
    throw new Error(payload.error?.message ?? `Stage export request failed (${response.status}).`);
  }
  return payload;
}

function notifyUi(status: "working" | "success" | "error", message: string) {
  figma.ui.postMessage({ status, message });
}

function rgb(hex: string): RGB {
  // Tolerate anything that is not a clean #RRGGBB (untrusted, DOM-derived) by
  // falling back to black rather than passing NaN channels to Figma.
  if (typeof hex !== "string" || !/^#[0-9a-fA-F]{6}$/.test(hex)) {
    return { r: 0, g: 0, b: 0 };
  }
  const value = Number.parseInt(hex.slice(1), 16);
  return {
    r: ((value >> 16) & 255) / 255,
    g: ((value >> 8) & 255) / 255,
    b: (value & 255) / 255,
  };
}
