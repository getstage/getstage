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

let mainWindow: BrowserWindowType | null = null;
let companionWindow: BrowserWindowType | null = null;
const MAIN_WINDOW_ACTIVATION_SUPPRESSION_MS = 1_500;
let suppressMainWindowActivationUntil = 0;

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

function dispatchCompanionOpen(window: BrowserWindowType) {
  void window.webContents.executeJavaScript(
    "window.dispatchEvent(new CustomEvent('stage-companion-open'))",
  );
}

function sendToCompanionWhenReady(window: BrowserWindowType, channel: string) {
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

function ensureDockVisible() {
  if (process.platform === "darwin") {
    app.dock?.show();
  }
}

export function openCompanionFromTray() {
  ensureDockVisible();
  const visibleMainWindow = getMainWindow();

  if (visibleMainWindow?.isFocused() && !visibleMainWindow.isMinimized()) {
    dispatchCompanionOpen(visibleMainWindow);
    return visibleMainWindow;
  }

  return createCompanionWindow();
}

export function openCompanionForVoiceShortcut() {
  const window = createCompanionWindow();
  sendToCompanionWhenReady(window, IPC_CHANNELS.voiceShortcutStartStopRecording);
  return window;
}

export function openCompanionForLatestChatShortcut() {
  const window = createCompanionWindow();
  sendToCompanionWhenReady(window, IPC_CHANNELS.voiceShortcutOpenLatestChat);
  return window;
}

export function createCompanionWindow() {
  if (companionWindow && !companionWindow.isDestroyed()) {
    const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
    companionWindow.setBounds(display.workArea);
    companionWindow.setFocusable(true);
    companionWindow.showInactive();
    dispatchCompanionOpen(companionWindow);
    return companionWindow;
  }

  const cursorPoint = screen.getCursorScreenPoint();
  const display = screen.getDisplayNearestPoint(cursorPoint);

  companionWindow = new BrowserWindow({
    ...display.workArea,
    show: false,
    title: "Stage Companion",
    backgroundColor: "#00000000",
    frame: false,
    transparent: true,
    resizable: false,
    maximizable: false,
    minimizable: false,
    fullscreenable: false,
    alwaysOnTop: true,
    skipTaskbar: process.platform !== "darwin",
    hasShadow: false,
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  companionWindow.setAlwaysOnTop(true, "floating");
  companionWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  companionWindow.setIgnoreMouseEvents(true, { forward: true });

  companionWindow.once("ready-to-show", () => {
    companionWindow?.showInactive();
  });

  denyWindowOpen(companionWindow);
  loadRenderer(companionWindow, { stageWindow: "companion" });

  companionWindow.on("closed", () => {
    companionWindow = null;
  });

  return companionWindow;
}

export function closeCompanionWindow() {
  if (companionWindow && !companionWindow.isDestroyed()) {
    suppressMainWindowActivationUntil = Date.now() + MAIN_WINDOW_ACTIVATION_SUPPRESSION_MS;
    companionWindow.hide();
    companionWindow.setIgnoreMouseEvents(true, { forward: true });
  }
}

function isCompanionWindowVisible() {
  return Boolean(companionWindow && !companionWindow.isDestroyed() && companionWindow.isVisible());
}

export function shouldSuppressMainWindowActivation() {
  return isCompanionWindowVisible() || Date.now() < suppressMainWindowActivationUntil;
}

export function setCompanionWindowInteractive(interactive: boolean) {
  if (!companionWindow || companionWindow.isDestroyed()) {
    return;
  }

  companionWindow.setIgnoreMouseEvents(!interactive, { forward: true });
}
