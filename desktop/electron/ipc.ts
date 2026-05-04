import { app, ipcMain, shell } from "electron";
import { IPC_CHANNELS } from "@shared/ipc/channels";
import {
  companionStateSchema,
  permissionKindSchema,
  type ActiveAppInfo,
  type DesktopPermissionStatus,
  type DesktopSession,
} from "@shared/models/desktop";

const defaultPermissionStatus: DesktopPermissionStatus = {
  "screen-recording": "unknown",
  microphone: "unknown",
  accessibility: "unknown",
  notifications: "unknown",
  files: "unknown",
};

export function registerIpcHandlers() {
  ipcMain.handle(IPC_CHANNELS.authOpenLogin, async () => {
    await shell.openExternal("https://getstage.co/auth");
  });

  ipcMain.handle(IPC_CHANNELS.authGetSession, (): DesktopSession | null => {
    return null;
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
}
