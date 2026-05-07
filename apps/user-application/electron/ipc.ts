import { app, BrowserWindow, ipcMain, shell } from "electron";
import { IPC_CHANNELS } from "@shared/ipc/channels";
import {
  companionStateSchema,
  desktopSessionSchema,
  engineStatusSchema,
  permissionKindSchema,
  type ActiveAppInfo,
  type DesktopPermissionStatus,
  type DesktopSession,
} from "@shared/models/desktop";
import { defaultPermissionStatus } from "./helpers/permissions";
import { getSelectedProjectContext } from "./project-context";
import type { SidecarSupervisor } from "./sidecar";
import type { DesktopAuthController } from "./auth";

type RegisterIpcHandlersOptions = {
  authController: DesktopAuthController;
  sidecarSupervisor: SidecarSupervisor;
};

export function registerIpcHandlers({
  authController,
  sidecarSupervisor,
}: RegisterIpcHandlersOptions) {
  ipcMain.handle(IPC_CHANNELS.authOpenLogin, async () => {
    await authController.openLogin();
  });

  ipcMain.handle(IPC_CHANNELS.authGetSession, async (): Promise<DesktopSession | null> => {
    const session = await authController.getSession();

    return session ? desktopSessionSchema.parse(session) : null;
  });

  ipcMain.handle(IPC_CHANNELS.projectContextGetSelected, async () => {
    return getSelectedProjectContext(authController);
  });

  ipcMain.handle(IPC_CHANNELS.engineGetStatus, () => {
    return engineStatusSchema.parse(sidecarSupervisor.getStatus());
  });

  ipcMain.handle(IPC_CHANNELS.companionShow, () => {
    return { ok: true };
  });

  ipcMain.handle(IPC_CHANNELS.companionHide, () => {
    return { ok: true };
  });

  ipcMain.handle(IPC_CHANNELS.companionSetState, (_event, state: unknown) => {
    companionStateSchema.parse(state);
    return { ok: true };
  });

  ipcMain.handle(IPC_CHANNELS.windowToggleMaximize, (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);

    if (!window) {
      return { ok: false };
    }

    if (window.isMaximized()) {
      window.unmaximize();
    } else {
      window.maximize();
    }

    return { ok: true };
  });

  ipcMain.handle(IPC_CHANNELS.screenGetActiveApp, (): ActiveAppInfo => {
    return {
      name: app.getName(),
      bundleId: app.getName(),
      windowTitle: "Stage Desktop",
    };
  });

  ipcMain.handle(IPC_CHANNELS.screenCaptureActiveWindow, () => {
    throw new Error("Screen capture is not implemented yet.");
  });

  ipcMain.handle(IPC_CHANNELS.permissionsGetStatus, (): DesktopPermissionStatus => {
    return defaultPermissionStatus;
  });

  ipcMain.handle(IPC_CHANNELS.permissionsOpenSystemSettings, async (_event, permission: unknown) => {
    permissionKindSchema.parse(permission);
    await shell.openExternal("x-apple.systempreferences:com.apple.preference.security?Privacy");
  });

  ipcMain.handle(IPC_CHANNELS.shellOpenExternal, async (_event, url: unknown) => {
    if (typeof url !== "string") {
      throw new Error("External URL must be a string.");
    }

    const parsedUrl = new URL(url);
    if (parsedUrl.protocol !== "https:") {
      throw new Error("Only HTTPS external URLs are allowed.");
    }

    await shell.openExternal(parsedUrl.toString());
  });
}
