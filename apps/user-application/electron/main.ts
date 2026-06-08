import { app, globalShortcut, Menu, session } from "electron";
import { join } from "node:path";
import {
  installRendererProtocol,
  registerRendererProtocolSchemes,
} from "./helpers/renderer-protocol";
import { loadLocalEnv } from "./helpers/loadEnv";
import { createDesktopAuthController } from "./auth";
import { createDesktopAuthCallbackServer } from "./helpers/auth-callback-server";
import { findStageAuthUrl, registerStageProtocol } from "./helpers/auth";
import { findStageIntegrationUrl } from "./helpers/integrations";
import { createDesktopIntegrationsController } from "./integrations";
import { registerIpcHandlers } from "./ipc";
import { registerVoiceHandlers } from "./voice";
import { fetchEngineJson } from "./helpers/sidecar";
import { providerListResponseSchema } from "@stage/data-ops/contracts";
import { createSidecarSupervisor } from "./sidecar";
import { checkForUpdates, initAutoUpdates, scheduleAutomaticUpdateCheckIfDue } from "./helpers/auto-update";
import {
  createMainWindow,
  destroyOrphanCompanionWindows,
  openCompanionForLatestChatShortcut,
  openCompanionForVoiceShortcut,
  shouldSuppressMainWindowActivation,
} from "./windows";
import { registerVoiceShortcuts } from "./voice/shortcuts";

loadLocalEnv();
registerRendererProtocolSchemes();

app.setName("Stage");
if (process.platform === "darwin") {
  app.dock?.show();
  const archLabel = process.arch === "arm64" ? "Apple Silicon" : "Intel";
  app.setAboutPanelOptions({
    applicationName: "Stage",
    applicationVersion: `${app.getVersion()} · ${archLabel}`,
    version: "",
  });
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
const shouldLogDesktopDebug =
  process.env.STAGE_DESKTOP_DEBUG === "1" ||
  (isDevelopment && process.env.STAGE_DESKTOP_DEBUG !== "0");
let sidecarStoppedForQuit = false;

function debugDesktop(message: string) {
  if (shouldLogDesktopDebug) {
    console.info(`[stage-desktop:debug] ${message}`);
  }
}

function installApplicationMenu() {
  const isMac = process.platform === "darwin";

  Menu.setApplicationMenu(Menu.buildFromTemplate([
    ...(isMac
      ? [{
          label: app.name,
          submenu: [
            { role: "about" },
            {
              label: "Check for Updates...",
              click: () => {
                void checkForUpdates({ manual: true });
              },
            },
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

if (!app.requestSingleInstanceLock()) {
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

function registerRendererMediaPermissions() {
  const mediaPermissions = new Set(["media", "microphone", "audioCapture"]);

  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(mediaPermissions.has(permission));
  });

  session.defaultSession.setPermissionCheckHandler((_webContents, permission) =>
    mediaPermissions.has(permission),
  );
}

app.whenReady().then(() => {
  const readyAt = Date.now();
  debugDesktop(`app ready packaged=${app.isPackaged ? "yes" : "no"}`);

  if (app.isPackaged) {
    installRendererProtocol(join(__dirname, "../renderer"));
    debugDesktop("renderer protocol installed");
  }

  registerRendererMediaPermissions();
  initAutoUpdates();
  installApplicationMenu();
  authCallbackServer.start();
  registerIpcHandlers({ authController, integrationsController, sidecarSupervisor });
  registerVoiceHandlers({
    listProviders: async () => {
      const status = await sidecarSupervisor.start();
      const payload = await fetchEngineJson<unknown>({
        path: "/v1/providers",
        port: status.port,
      });

      return providerListResponseSchema.parse(payload);
    },
  });
  const shortcutResult = registerVoiceShortcuts({
    openLatestChat: openCompanionForLatestChatShortcut,
    startStopRecording: openCompanionForVoiceShortcut,
  });
  if (!shortcutResult.registrations.voiceNote.registered) {
    console.warn(
      `[stage-voice] Could not register voice shortcut ${shortcutResult.registrations.voiceNote.accelerator}.`,
    );
  }
  if (!shortcutResult.registrations.aiChat.registered) {
    console.warn(
      `[stage-voice] Could not register chat shortcut ${shortcutResult.registrations.aiChat.accelerator}.`,
    );
  }
  authController.consumeQueuedCallback().then((result) => {
    if (result && !result.ok) {
      console.warn(`[stage-auth] ${result.error}`);
    }
  }).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Unknown queued desktop auth callback error.";
    console.warn(`[stage-auth] ${message}`);
  });
  void integrationsController.consumeQueuedCallback();

  createMainWindow();
  destroyOrphanCompanionWindows();
  debugDesktop(`main window requested after ${Date.now() - readyAt}ms; sidecar deferred until first engine IPC`);
  void installStageTrayIfEnabled();

  app.on("activate", () => {
    if (shouldSuppressMainWindowActivation()) {
      return;
    }

    createMainWindow();
    scheduleAutomaticUpdateCheckIfDue();
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
  if (process.platform !== "darwin") {
    app.quit();
  }
});
