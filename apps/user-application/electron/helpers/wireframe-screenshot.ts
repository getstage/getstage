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
