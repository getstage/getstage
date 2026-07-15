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
      multiline: boolean;
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
    await collapseViewportFillers(window);
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
    await collapseViewportFillers(window);
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
    const padL = parseFloat(style.paddingLeft) || 0;
    const padT = parseFloat(style.paddingTop) || 0;
    const padB = parseFloat(style.paddingBottom) || 0;
    if (text && isControl) {
      // Values sit inside the field: offset by left padding and vertically center.
      const fs = parseFloat(style.fontSize) || 16;
      textX = x + padL;
      textY = y + Math.max(0, (rect.height - fs) / 2);
    } else if (text && (padT > 0 || padL > 0)) {
      // Padded leaf text (buttons, pills, chips): CSS content box starts after
      // padding. Without this, Figma text sits on the top edge of the filled rect
      // ("two parts": label stuck high, empty fill below).
      const align = style.textAlign || "left";
      const centered = align === "center" || align === "right" || align === "justify";
      textX = centered ? x : x + padL;
      textY = y + padT;
    }
    if (text) {
      // Computed line-height resolves to px unless "normal"; carry it so Figma
      // matches the design's line spacing instead of ballooning multi-line text.
      const fs = parseFloat(style.fontSize) || 16;
      const lh = parseFloat(style.lineHeight);
      const lhPx = isFinite(lh) && lh > 0 ? lh : fs * 1.3;
      // Use content-box height so padding on buttons/pills doesn't look like wrap.
      const contentH = Math.max(0, rect.height - padT - padB);
      const multiline = contentH > lhPx * 1.5;
      nodes.push({
        type: "text", x: textX, y: textY, w: rect.width, text,
        fontSize: fs,
        fontFamily: family(style.fontFamily),
        fontWeight: parseInt(style.fontWeight, 10) || 400,
        color: toHex(style.color) || "#171717",
        align: style.textAlign || "left",
        lineHeight: isFinite(lh) && lh > 0 ? lh : undefined,
        multiline: multiline,
      });
    }
  }
  // Size the frame to the deepest layer's bottom, not the document height — a
  // short design in a taller viewport otherwise leaves a big white band below.
  // Also drop near-full-frame white rects (duplicate of the root fill).
  let contentBottom = 0;
  const filtered = [];
  const rootW = Math.round(root.scrollWidth) || ${WIREFRAME_DESIGN_WIDTH};
  for (const node of nodes) {
    const h = node.type === "text" ? (node.fontSize || 16) * 1.5 : node.h || 0;
    const bottom = node.y + h;
    if (bottom > contentBottom) contentBottom = bottom;
  }
  const frameH = Math.max(1, Math.ceil(contentBottom));
  for (const node of nodes) {
    if (node.type === "rect") {
      const nearFullW = node.w >= rootW * 0.95;
      const nearFullH = node.h >= frameH * 0.9 || node.h >= window.innerHeight * 0.9;
      const fill = (node.fill || "").toLowerCase();
      const isWhite = !fill || fill === "#ffffff" || fill === "#fff" || fill === "#fafafa";
      if (nearFullW && nearFullH && isWhite && node.y <= 2) continue;
    }
    filtered.push(node);
  }
  return {
    width: rootW,
    height: frameH,
    nodes: filtered,
  };
})()`;

/** Strip 100vh / flex-centered empty shells so measure + export hug content. */
async function collapseViewportFillers(window: BrowserWindow): Promise<void> {
  await window.webContents.executeJavaScript(`(() => {
    const vh = window.innerHeight;
    const nearlyViewport = (px) => Math.abs(px - vh) < 4 || px >= vh - 1;
    const targets = [document.documentElement, document.body, ...document.body.children];
    for (const el of targets) {
      if (!(el instanceof HTMLElement)) continue;
      const style = getComputedStyle(el);
      const minH = parseFloat(style.minHeight);
      const h = parseFloat(style.height);
      if (nearlyViewport(minH) || nearlyViewport(h) || el.getBoundingClientRect().height >= vh - 2) {
        el.style.minHeight = "0";
        el.style.height = "auto";
        el.style.maxHeight = "none";
      }
      const display = style.display;
      if ((display === "flex" || display === "grid") && el.getBoundingClientRect().height >= vh - 2) {
        const direction = style.flexDirection || "row";
        const isColumn = direction === "column" || direction === "column-reverse";
        // Drop only the *vertical* centering that creates empty bands.
        if (isColumn) {
          if (style.justifyContent === "center" || style.justifyContent === "safe center") {
            el.style.justifyContent = "flex-start";
          }
        } else if (style.alignItems === "center" || style.alignItems === "safe center") {
          el.style.alignItems = "flex-start";
        }
        const padY = Math.max(parseFloat(style.paddingTop) || 0, parseFloat(style.paddingBottom) || 0);
        if (padY < 24) {
          el.style.paddingTop = "48px";
          el.style.paddingBottom = "48px";
        }
      }
    }
    // Inline style attributes often set min-height:100vh harder than stylesheet rules.
    for (const el of document.querySelectorAll("[style]")) {
      if (!(el instanceof HTMLElement) || !el.style) continue;
      const raw = el.getAttribute("style") || "";
      if (/min-height\\s*:\\s*100vh/i.test(raw) || /height\\s*:\\s*100vh/i.test(raw)) {
        el.style.minHeight = "0";
        el.style.height = "auto";
      }
    }
  })()`);
}

async function measureCaptureHeight(window: BrowserWindow): Promise<number> {
  const height = await window.webContents.executeJavaScript(`
    (() => {
      let bottom = 0;
      for (const el of document.body.querySelectorAll("*")) {
        const style = getComputedStyle(el);
        if (style.display === "none" || style.visibility === "hidden" || parseFloat(style.opacity) === 0) {
          continue;
        }
        const rect = el.getBoundingClientRect();
        if (rect.width < 1 || rect.height < 1) continue;
        const candidate = rect.bottom + window.scrollY;
        if (candidate > bottom) bottom = candidate;
      }
      const scroll = Math.max(
        document.documentElement.scrollHeight || 0,
        document.body.scrollHeight || 0,
      );
      // Prefer content-bottom; fall back to scrollHeight if walk found nothing.
      const measured = bottom > 0 ? bottom : scroll;
      return Math.min(${MAX_CAPTURE_HEIGHT}, Math.max(1, Math.ceil(measured + 8)));
    })()
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
      const waiters = [];
      const settle = (el) => new Promise((r) => {
        el.addEventListener("load", r, { once: true });
        el.addEventListener("error", r, { once: true });
      });

      for (const image of Array.from(document.images || [])) {
        if (!image.complete) waiters.push(settle(image));
      }

      // CSS background-image photos (HIFI_RULES allows Unsplash hero/card fills
      // that never appear in document.images) — preload each URL so the capture
      // waits for them instead of shooting blank slots.
      const seen = new Set();
      for (const el of document.querySelectorAll("*")) {
        const bg = getComputedStyle(el).backgroundImage;
        if (!bg || bg === "none") continue;
        for (const match of bg.match(/url\\(([^)]+)\\)/g) || []) {
          const url = match.slice(4, -1).replace(/['"]/g, "").trim();
          if (!/^https?:/.test(url) || seen.has(url)) continue;
          seen.add(url);
          const preload = new Image();
          waiters.push(settle(preload));
          preload.src = url;
        }
      }

      if (waiters.length === 0) {
        afterPaint();
        return;
      }
      Promise.all(waiters).then(afterPaint);
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
