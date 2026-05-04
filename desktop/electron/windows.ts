import {
  BrowserWindow,
  shell,
  type BrowserWindow as BrowserWindowType,
  type HandlerDetails,
} from "electron";
import { join } from "node:path";

let mainWindow: BrowserWindowType | null = null;

export function createMainWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
    mainWindow.focus();
    return mainWindow;
  }

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 900,
    minWidth: 960,
    minHeight: 680,
    show: false,
    title: "Stage",
    backgroundColor: "#f7f7f7",
    titleBarStyle: "hiddenInset",
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });

  mainWindow.webContents.setWindowOpenHandler((details: HandlerDetails) => {
    void shell.openExternal(details.url);
    return { action: "deny" };
  });

  const rendererUrl = process.env.ELECTRON_RENDERER_URL;
  if (rendererUrl) {
    void mainWindow.loadURL(rendererUrl);
  } else {
    void mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  return mainWindow;
}

export function getMainWindow() {
  return mainWindow && !mainWindow.isDestroyed() ? mainWindow : null;
}
