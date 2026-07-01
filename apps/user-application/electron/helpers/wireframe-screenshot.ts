import { BrowserWindow } from "electron";
import {
  buildWireframePreviewDocument,
  WIREFRAME_DESIGN_WIDTH,
} from "@shared/wireframePreviewDocument";

const MAX_CAPTURE_HEIGHT = 4096;
const RENDER_TIMEOUT_MS = 60_000;

export type WireframeScreenshot = {
  png: Buffer;
  width: number;
  height: number;
};

// An absolutely-positioned layer extracted from the rendered design, ready for
// the Figma plugin to rebuild as a native node. A discriminated union (mirroring
// the engine's tagged enum) so a rect can never carry text and a text can never
// carry a url — invalid shapes are unrepresentable. The remaining `?` are
// genuinely-absent CSS properties (an element may have no fill/border), not null.
export type WireframeFigmaNode =
  | {
      type: "rect";
      x: number;
      y: number;
      w: number;
      h: number;
      radius: number;
      fill?: string;
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
    }
  | {
      type: "image";
      x: number;
      y: number;
      w: number;
      h: number;
      url: string;
      radius: number;
      fit: string;
    };

export type WireframeFigmaNodeTree = {
  width: number;
  height: number;
  nodes: WireframeFigmaNode[];
};

export async function captureWireframeHtmlPng(htmlFragment: string): Promise<WireframeScreenshot> {
  const trimmed = htmlFragment.trim();
  if (!trimmed) {
    throw new Error("Hi-Fi wireframe HTML is empty.");
  }

  const window = new BrowserWindow({
    show: false,
    width: WIREFRAME_DESIGN_WIDTH,
    height: 900,
    webPreferences: {
      offscreen: true,
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  try {
    const document = buildWireframePreviewDocument(trimmed);
    await window.loadURL(
      `data:text/html;charset=utf-8,${encodeURIComponent(document)}`,
    );
    await waitForWireframeRender(window.webContents);
    const height = await measureCaptureHeight(window);
    window.setContentSize(WIREFRAME_DESIGN_WIDTH, height);
    await waitForWireframeRender(window.webContents);
    const png = (await window.webContents.capturePage()).toPNG();
    if (png.byteLength === 0) {
      throw new Error("Could not render the Hi-Fi wireframe preview.");
    }

    return {
      png,
      width: WIREFRAME_DESIGN_WIDTH,
      height,
    };
  } finally {
    if (!window.isDestroyed()) {
      window.destroy();
    }
  }
}

// Renders the fragment offscreen (same pipeline as the screenshot) then walks the
// live DOM into a flat layer list the Figma plugin rebuilds as editable nodes —
// so the export is real text/rects/images instead of a flattened picture.
export async function captureWireframeFigmaNodes(
  htmlFragment: string,
): Promise<WireframeFigmaNodeTree> {
  const trimmed = htmlFragment.trim();
  if (!trimmed) {
    throw new Error("Hi-Fi wireframe HTML is empty.");
  }

  const window = new BrowserWindow({
    show: false,
    width: WIREFRAME_DESIGN_WIDTH,
    height: 900,
    webPreferences: {
      offscreen: true,
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  try {
    const document = buildWireframePreviewDocument(trimmed);
    await window.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(document)}`);
    await waitForWireframeRender(window.webContents);
    const height = await measureCaptureHeight(window);
    window.setContentSize(WIREFRAME_DESIGN_WIDTH, height);
    await waitForWireframeRender(window.webContents);
    const tree = (await window.webContents.executeJavaScript(
      WIREFRAME_FIGMA_WALKER,
    )) as WireframeFigmaNodeTree;
    if (!tree || !Array.isArray(tree.nodes) || tree.nodes.length === 0) {
      throw new Error("Could not extract editable layers from the Hi-Fi wireframe.");
    }
    return tree;
  } finally {
    if (!window.isDestroyed()) {
      window.destroy();
    }
  }
}

// Runs in the offscreen page. Emits parents before children (document order) so
// backgrounds paint behind their text once the plugin appends in sequence.
const WIREFRAME_FIGMA_WALKER = `(() => {
  const toHex = (value) => {
    const match = /rgba?\\(([^)]+)\\)/.exec(value || "");
    if (!match) return null;
    const parts = match[1].split(",").map((piece) => piece.trim());
    const a = parts.length > 3 ? parseFloat(parts[3]) : 1;
    if (!a) return null;
    const hex = (n) => Math.max(0, Math.min(255, parseInt(n, 10))).toString(16).padStart(2, "0");
    return "#" + hex(parts[0]) + hex(parts[1]) + hex(parts[2]);
  };
  const family = (value) => (value || "").split(",")[0].replace(/['"]/g, "").trim() || "Inter";
  const directText = (el) => {
    let text = "";
    for (const child of el.childNodes) {
      if (child.nodeType === 3) text += child.textContent;
    }
    return text.replace(/\\s+/g, " ").trim();
  };
  const MAX_NODES = 6000;
  const MAX_TEXT = 2000;
  const nodes = [];
  const root = document.body;
  const all = root.querySelectorAll("*");
  for (const el of all) {
    if (nodes.length >= MAX_NODES) break;
    const rect = el.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) continue;
    const style = getComputedStyle(el);
    if (style.visibility === "hidden" || style.display === "none" || parseFloat(style.opacity) === 0) continue;
    const x = rect.left + window.scrollX;
    const y = rect.top + window.scrollY;
    const radius = parseFloat(style.borderTopLeftRadius) || 0;
    if (el.tagName === "IMG") {
      const url = el.currentSrc || el.src;
      // https only: the plugin fetches this URL, and Figma's manifest domain
      // allowlist is the outer gate — never forward data:/http:/blob: sources.
      if (url && url.indexOf("https://") === 0) {
        const objectFit = style.objectFit;
        const fit = objectFit === "contain" || objectFit === "scale-down" ? "FIT" : "FILL";
        nodes.push({ type: "image", x, y, w: rect.width, h: rect.height, url, radius, fit });
      }
      continue;
    }
    const fill = toHex(style.backgroundColor);
    const borderWeight = parseFloat(style.borderTopWidth) || 0;
    const strokeColor = borderWeight > 0 ? toHex(style.borderTopColor) : null;
    if (fill || strokeColor) {
      nodes.push({
        type: "rect", x, y, w: rect.width, h: rect.height,
        fill: fill || undefined, radius,
        strokeColor: strokeColor || undefined,
        strokeWeight: strokeColor ? borderWeight : undefined,
      });
    }
    // Form-control values live on the element (el.value / selected option), not
    // as text children, so directText misses them and inputs export blank.
    const tag = el.tagName;
    const isControl = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
    let text = directText(el).slice(0, MAX_TEXT);
    let textX = x;
    let textY = y;
    if (!text && (tag === "INPUT" || tag === "TEXTAREA")) {
      text = (el.value || el.getAttribute("placeholder") || "").replace(/\\s+/g, " ").trim().slice(0, MAX_TEXT);
    } else if (!text && tag === "SELECT") {
      const opt = el.options && el.options[el.selectedIndex];
      text = ((opt && opt.text) || "").replace(/\\s+/g, " ").trim().slice(0, MAX_TEXT);
    }
    if (text && isControl) {
      // Values sit inside the field: offset by left padding and vertically center.
      const fs = parseFloat(style.fontSize) || 16;
      textX = x + (parseFloat(style.paddingLeft) || 0);
      textY = y + Math.max(0, (rect.height - fs) / 2);
    }
    if (text) {
      // Computed line-height resolves to px unless "normal"; carry it so Figma
      // matches the design's line spacing instead of ballooning multi-line text.
      const lh = parseFloat(style.lineHeight);
      nodes.push({
        type: "text", x: textX, y: textY, w: rect.width, text,
        fontSize: parseFloat(style.fontSize) || 16,
        fontFamily: family(style.fontFamily),
        fontWeight: parseInt(style.fontWeight, 10) || 400,
        color: toHex(style.color) || "#171717",
        align: style.textAlign || "left",
        lineHeight: isFinite(lh) && lh > 0 ? lh : undefined,
      });
    }
  }
  // Size the frame to the deepest layer's bottom, not the document height — a
  // short design in a taller viewport otherwise leaves a big white band below.
  let contentBottom = 0;
  for (const node of nodes) {
    const h = node.type === "text" ? (node.fontSize || 16) * 1.5 : node.h || 0;
    const bottom = node.y + h;
    if (bottom > contentBottom) contentBottom = bottom;
  }
  return {
    width: Math.round(root.scrollWidth),
    height: Math.max(1, Math.ceil(contentBottom)),
    nodes,
  };
})()`;

async function measureCaptureHeight(window: BrowserWindow): Promise<number> {
  const height = await window.webContents.executeJavaScript(`
    Math.min(
      ${MAX_CAPTURE_HEIGHT},
      Math.max(
        document.documentElement.scrollHeight || 0,
        document.body.scrollHeight || 0,
        document.documentElement.offsetHeight || 0,
        document.body.offsetHeight || 0
      )
    )
  `);

  if (typeof height !== "number" || !Number.isFinite(height) || height <= 0) {
    throw new Error("Could not measure the Hi-Fi wireframe height.");
  }

  return Math.round(height);
}

async function waitForWireframeRender(
  webContents: Electron.WebContents,
): Promise<void> {
  await withRenderTimeout(webContents.executeJavaScript(`
    new Promise((resolve) => {
      const afterPaint = () => requestAnimationFrame(() => requestAnimationFrame(resolve));
      const images = Array.from(document.images || []);
      if (images.length === 0) {
        afterPaint();
        return;
      }

      let pending = images.length;
      const done = () => {
        pending -= 1;
        if (pending <= 0) {
          afterPaint();
        }
      };

      for (const image of images) {
        if (image.complete) {
          done();
        } else {
          image.addEventListener("load", done, { once: true });
          image.addEventListener("error", done, { once: true });
        }
      }

      setTimeout(afterPaint, 5000);
    })
  `));
}

async function withRenderTimeout<T>(promise: Promise<T>): Promise<T> {
  let timer: NodeJS.Timeout | null = null;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("Timed out while rendering the Hi-Fi wireframe.")),
          RENDER_TIMEOUT_MS,
        );
      }),
    ]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}
