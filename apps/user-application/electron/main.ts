import { app, Menu } from "electron";
import { createDesktopAuthController } from "./auth";
import { createDesktopAuthCallbackServer } from "./helpers/auth-callback-server";
import { findStageAuthUrl, registerStageProtocol } from "./helpers/auth";
import { registerIpcHandlers } from "./ipc";
import { createSidecarSupervisor } from "./sidecar";
import { createMainWindow, shouldSuppressMainWindowActivation } from "./windows";

app.setName("Stage");
if (process.platform === "darwin") {
  app.dock?.show();
}
registerStageProtocol();
const authController = createDesktopAuthController();
const authCallbackServer = createDesktopAuthCallbackServer(authController);
const sidecarSupervisor = createSidecarSupervisor();
const isDevelopment = !app.isPackaged;
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

if (!isDevelopment && !app.requestSingleInstanceLock()) {
  app.quit();
}

const launchAuthUrl = findStageAuthUrl(process.argv);

if (launchAuthUrl) {
  authController.queueCallbackUrl(launchAuthUrl);
}

function shouldInstallStageTray() {
  return process.env.STAGE_DISABLE_TRAY !== "1";
}

async function installStageTrayIfEnabled() {
  if (!shouldInstallStageTray()) {
    return;
  }

  try {
    const { installStageTray } = await import("./tray");
    installStageTray();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown tray setup error.";
    console.warn(`[stage-tray] ${message}`);
  }
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
  authCallbackServer.start();
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
    void installStageTrayIfEnabled();
  });

  app.on("activate", () => {
    if (shouldSuppressMainWindowActivation()) {
      return;
    }

    createMainWindow();
  });
});

app.on("before-quit", (event) => {
  if (sidecarStoppedForQuit) {
    return;
  }

  event.preventDefault();
  authCallbackServer.stop();
  sidecarSupervisor.stop().finally(() => {
    sidecarStoppedForQuit = true;
    app.quit();
  });
});

app.on("window-all-closed", () => {
  if (isDevelopment || process.platform !== "darwin") {
    app.quit();
  }
});
