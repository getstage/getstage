import { app, globalShortcut, Menu } from "electron";
import { loadLocalEnv } from "./helpers/loadEnv";
import { createDesktopAuthController } from "./auth";
import { createDesktopAuthCallbackServer } from "./helpers/auth-callback-server";
import { findStageAuthUrl, registerStageProtocol } from "./helpers/auth";
import { findStageIntegrationUrl } from "./helpers/integrations";
import { createDesktopIntegrationsController } from "./integrations";
import { registerIpcHandlers } from "./ipc";
import { registerVoiceTranscriptionHandler } from "./voice-transcription";
import { createSidecarSupervisor } from "./sidecar";
import {
  createMainWindow,
  openCompanionForLatestChatShortcut,
  openCompanionForVoiceShortcut,
  shouldSuppressMainWindowActivation,
} from "./windows";

loadLocalEnv();

app.setName("Stage");
if (process.platform === "darwin") {
  app.dock?.show();
}
registerStageProtocol();
const authController = createDesktopAuthController();
const integrationsController = createDesktopIntegrationsController();
const authCallbackServer = createDesktopAuthCallbackServer({
  authController,
  integrationsController,
});
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

function handleDeepLinkUrl(url: string) {
  if (!app.isReady()) {
    authController.queueCallbackUrl(url);
    integrationsController.queueCallbackUrl(url);
    return;
  }

  if (integrationsController.handleCallbackUrl(url)) {
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

function findStageDeepLinkUrl(argv: string[]) {
  return findStageAuthUrl(argv) ?? findStageIntegrationUrl(argv) ?? null;
}

if (!isDevelopment && !app.requestSingleInstanceLock()) {
  app.quit();
}

const launchDeepLinkUrl = findStageDeepLinkUrl(process.argv);

if (launchDeepLinkUrl) {
  authController.queueCallbackUrl(launchDeepLinkUrl);
  integrationsController.queueCallbackUrl(launchDeepLinkUrl);
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

function registerVoiceShortcuts() {
  const shortcuts = [
    {
      accelerator: "CommandOrControl+Shift+V",
      label: "voice note",
      action: openCompanionForVoiceShortcut,
    },
    {
      accelerator: "CommandOrControl+Shift+A",
      label: "latest AI chat",
      action: openCompanionForLatestChatShortcut,
    },
  ];

  for (const shortcut of shortcuts) {
    const registered = globalShortcut.register(shortcut.accelerator, shortcut.action);
    if (!registered) {
      console.warn(`[stage-voice] Could not register ${shortcut.label} shortcut ${shortcut.accelerator}.`);
    }
  }
}

app.on("open-url", (event, url) => {
  event.preventDefault();
  handleDeepLinkUrl(url);
});

app.on("second-instance", (_event, argv) => {
  const deepLinkUrl = findStageDeepLinkUrl(argv);

  if (!deepLinkUrl) {
    createMainWindow();
    return;
  }

  handleDeepLinkUrl(deepLinkUrl);
});

app.whenReady().then(() => {
  installApplicationMenu();
  authCallbackServer.start();
  registerIpcHandlers({ authController, integrationsController, sidecarSupervisor });
  registerVoiceTranscriptionHandler();
  registerVoiceShortcuts();
  authController.consumeQueuedCallback().then((result) => {
    if (result && !result.ok) {
      console.warn(`[stage-auth] ${result.error}`);
    }
  }).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Unknown queued desktop auth callback error.";
    console.warn(`[stage-auth] ${message}`);
  });
  void integrationsController.consumeQueuedCallback();

  sidecarSupervisor.start().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Unknown sidecar startup error.";
    console.warn(`[stage-engine] ${message}`);
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

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
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
