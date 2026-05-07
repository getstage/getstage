import { app, Menu } from "electron";
import { createDesktopAuthController } from "./auth";
import { findStageAuthUrl, registerStageProtocol } from "./helpers/auth";
import { registerIpcHandlers } from "./ipc";
import { createSidecarSupervisor } from "./sidecar";
import { createMainWindow } from "./windows";

app.setName("Stage");
registerStageProtocol();
const authController = createDesktopAuthController();
const sidecarSupervisor = createSidecarSupervisor();
let sidecarStoppedForQuit = false;

function installApplicationMenu() {
  const isMac = process.platform === "darwin";

  Menu.setApplicationMenu(Menu.buildFromTemplate([
    ...(isMac
      ? [{
          label: app.name,
          submenu: [
            { role: "about" },
            { type: "separator" },
            { role: "services" },
            { type: "separator" },
            { role: "hide" },
            { role: "hideOthers" },
            { role: "unhide" },
            { type: "separator" },
            { role: "quit" },
          ],
        } as Electron.MenuItemConstructorOptions]
      : []),
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Window",
      submenu: [
        { role: "minimize" },
        { role: "zoom" },
        ...(isMac
          ? [
              { type: "separator" as const },
              { role: "front" as const },
              { type: "separator" as const },
              { role: "window" as const },
            ]
          : [{ role: "close" as const }]),
      ],
    },
  ]));
}

function handleAuthCallbackUrl(url: string) {
  if (!app.isReady()) {
    authController.queueCallbackUrl(url);
    return;
  }

  authController.handleCallbackUrl(url).then((result) => {
    if (result && !result.ok) {
      console.warn(`[stage-auth] ${result.error}`);
    }
  }).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Unknown desktop auth callback error.";
    console.warn(`[stage-auth] ${message}`);
  });
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
}

const launchAuthUrl = findStageAuthUrl(process.argv);

if (launchAuthUrl) {
  authController.queueCallbackUrl(launchAuthUrl);
}

app.on("open-url", (event, url) => {
  event.preventDefault();
  handleAuthCallbackUrl(url);
});

app.on("second-instance", (_event, argv) => {
  const authUrl = findStageAuthUrl(argv);

  if (!authUrl) {
    createMainWindow();
    return;
  }

  handleAuthCallbackUrl(authUrl);
});

app.whenReady().then(() => {
  installApplicationMenu();
  registerIpcHandlers({ authController, sidecarSupervisor });
  authController.consumeQueuedCallback().then((result) => {
    if (result && !result.ok) {
      console.warn(`[stage-auth] ${result.error}`);
    }
  }).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Unknown queued desktop auth callback error.";
    console.warn(`[stage-auth] ${message}`);
  });

  sidecarSupervisor.start().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Unknown sidecar startup error.";
    console.warn(`[stage-data-service] ${message}`);
  }).finally(() => {
    createMainWindow();
  });

  app.on("activate", () => {
    createMainWindow();
  });
});

app.on("before-quit", (event) => {
  if (sidecarStoppedForQuit) {
    return;
  }

  event.preventDefault();
  sidecarSupervisor.stop().finally(() => {
    sidecarStoppedForQuit = true;
    app.quit();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
