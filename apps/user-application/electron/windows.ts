import {
  app,
  BrowserWindow,
  screen,
  shell,
  type BrowserWindow as BrowserWindowType,
  type HandlerDetails,
} from "electron";
import { join } from "node:path";
import { IPC_CHANNELS } from "@shared/ipc/channels";
import { rendererAppUrl } from "./helpers/renderer-protocol";
import { onMainWindowReady } from "./helpers/auto-update";
import { getCompanionWidgetSettings } from "./helpers/companion-preferences";

let mainWindow: BrowserWindowType | null = null;
let companionWindow: BrowserWindowType | null = null;

function denyWindowOpen(window: BrowserWindowType) {
  window.webContents.setWindowOpenHandler((details: HandlerDetails) => {
    void shell.openExternal(details.url);
    return { action: "deny" };
  });
}

function loadRenderer(window: BrowserWindowType, query?: Record<string, string>) {
  const rendererUrl = process.env.ELECTRON_RENDERER_URL;

  if (rendererUrl) {
    const url = new URL(rendererUrl);

    Object.entries(query ?? {}).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });

    void window.loadURL(url.toString());
    return;
  }

  if (app.isPackaged) {
    void window.loadURL(rendererAppUrl("index.html", query));
    return;
  }

  void window.loadFile(join(__dirname, "../renderer/index.html"), query ? { query } : undefined);
}

export function createMainWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
    mainWindow.focus();
    return mainWindow;
  }

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 900,
    minWidth: 760,
    minHeight: 540,
    show: false,
    title: "Stage",
    backgroundColor: "#f7f7f7",
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 16, y: 18 },
    resizable: true,
    maximizable: true,
    minimizable: true,
    fullscreenable: true,
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: true,
    },
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
    if (!app.isPackaged) {
      mainWindow?.webContents.openDevTools({ mode: "detach" });
    }
    onMainWindowReady();
  });

  if (!app.isPackaged) {
    mainWindow.webContents.on("render-process-gone", (_event, details) => {
      console.error("[stage-renderer] render-process-gone:", details);
    });
    mainWindow.webContents.on("did-fail-load", (_event, code, description, url) => {
      console.error(
        `[stage-renderer] did-fail-load: ${code} ${description} at ${url}`,
      );
    });
    mainWindow.webContents.on(
      "console-message",
      (_event, level, message, line, sourceId) => {
        if (message.includes("[vite] hot updated")) {
          return;
        }
        const prefix =
          level === 3 ? "[renderer error]" : level === 2 ? "[renderer warn]" : "[renderer]";
        console.log(`${prefix} ${message} (${sourceId}:${line})`);
      },
    );
  }

  denyWindowOpen(mainWindow);
  loadRenderer(mainWindow);

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  return mainWindow;
}

export function getMainWindow() {
  return mainWindow && !mainWindow.isDestroyed() ? mainWindow : null;
}

function isLegacyCompanionWindow(window: BrowserWindowType) {
  if (window === mainWindow) {
    return false;
  }

  if (window === companionWindow) {
    return false;
  }

  try {
    const url = window.webContents.getURL();
    if (url && new URL(url).searchParams.get("stageWindow") === "companion") {
      return true;
    }
  } catch {
    // Fall through to title/name checks for unloaded or malformed legacy windows.
  }

  return window.getTitle() === "Stage Companion";
}

function sendToRendererWhenReady(window: BrowserWindowType, channel: string) {
  const send = () => {
    setTimeout(() => {
      if (!window.isDestroyed()) {
        window.webContents.send(channel);
      }
    }, 100).unref();
  };

  if (window.webContents.isLoading()) {
    window.webContents.once("did-finish-load", send);
    return;
  }

  send();
}

export function destroyOrphanCompanionWindows() {
  for (const window of BrowserWindow.getAllWindows()) {
    if (window.isDestroyed() || !isLegacyCompanionWindow(window)) {
      continue;
    }

    window.destroy();
  }
}

function routeShortcutToMainWindow(channel: string) {
  destroyOrphanCompanionWindows();
  ensureDockVisible();

  const window = getMainWindow() ?? createMainWindow();
  if (window.isMinimized()) {
    window.restore();
  }
  window.show();
  window.focus();

  sendToRendererWhenReady(window, channel);

  return window;
}

function ensureDockVisible() {
  if (process.platform === "darwin") {
    app.dock?.show();
  }
}

function getCompanionWindowBounds() {
  const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  return display.workArea;
}

function positionCompanionWindow(window: BrowserWindowType) {
  const { x, y, width, height } = getCompanionWindowBounds();
  window.setBounds({ x, y, width, height }, false);
}

function configureCompanionWindow(window: BrowserWindowType) {
  window.setAlwaysOnTop(true, "floating");
  window.setIgnoreMouseEvents(true, { forward: true });

  if (process.platform === "darwin") {
    window.setVisibleOnAllWorkspaces(true, {
      visibleOnFullScreen: true,
    });
  }
}

function createCompanionWindow() {
  if (companionWindow && !companionWindow.isDestroyed()) {
    positionCompanionWindow(companionWindow);
    return companionWindow;
  }

  const { x, y, width, height } = getCompanionWindowBounds();
  companionWindow = new BrowserWindow({
    x,
    y,
    width,
    height,
    show: false,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    hasShadow: false,
    title: "Stage Companion",
    backgroundColor: "#00000000",
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
    },
  });

  configureCompanionWindow(companionWindow);
  denyWindowOpen(companionWindow);
  loadRenderer(companionWindow, { stageWindow: "companion" });

  companionWindow.once("ready-to-show", () => {
    if (!companionWindow || companionWindow.isDestroyed()) {
      return;
    }

    positionCompanionWindow(companionWindow);
    configureCompanionWindow(companionWindow);
    companionWindow.showInactive();
  });

  companionWindow.on("closed", () => {
    companionWindow = null;
  });

  return companionWindow;
}

function openMainWindowFromCompanionEntry() {
  ensureDockVisible();
  const window = getMainWindow() ?? createMainWindow();
  if (window.isMinimized()) {
    window.restore();
  }
  window.show();
  window.focus();
  return window;
}

export function openCompanionFromTray() {
  if (!getCompanionWidgetSettings().allowEverywhere) {
    return openMainWindowFromCompanionEntry();
  }

  // STA-7: tray click always opens the voice companion. Keep the Dock icon
  // visible so Stage never looks closed while the buddy is up.
  ensureDockVisible();
  const window = createCompanionWindow();
  positionCompanionWindow(window);
  configureCompanionWindow(window);
  window.showInactive();
  return window;
}

export function openCompanionForVoiceShortcut() {
  routeShortcutToMainWindow(IPC_CHANNELS.voiceShortcutStartStopRecording);
}

export function openCompanionForLatestChatShortcut() {
  routeShortcutToMainWindow(IPC_CHANNELS.voiceShortcutOpenLatestChat);
}

export function closeCompanionWindow() {
  if (companionWindow && !companionWindow.isDestroyed()) {
    companionWindow.destroy();
    companionWindow = null;
  }

  destroyOrphanCompanionWindows();
}

export function shouldSuppressMainWindowActivation() {
  return false;
}

export function setCompanionWindowInteractive(interactive: boolean) {
  if (!companionWindow || companionWindow.isDestroyed()) {
    return;
  }

  companionWindow.setIgnoreMouseEvents(!interactive, { forward: true });
}
