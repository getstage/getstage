import { contextBridge, ipcRenderer } from "electron";
import { IPC_CHANNELS } from "@shared/ipc/channels";
import type { CompanionState, DesktopSession, PermissionKind } from "@shared/models/desktop";

const stageDesktop = {
  auth: {
    openLogin: () => ipcRenderer.invoke(IPC_CHANNELS.authOpenLogin),
    logout: () => ipcRenderer.invoke(IPC_CHANNELS.authLogout),
    getSession: () => ipcRenderer.invoke(IPC_CHANNELS.authGetSession),
    getAccessToken: () => ipcRenderer.invoke(IPC_CHANNELS.authGetAccessToken),
    onSessionChanged: (callback: (session: DesktopSession | null) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, session: DesktopSession | null) => {
        callback(session);
      };

      ipcRenderer.on(IPC_CHANNELS.authSessionChanged, listener);
      return () => {
        ipcRenderer.off(IPC_CHANNELS.authSessionChanged, listener);
      };
    },
  },
  engine: {
    getStatus: () => ipcRenderer.invoke(IPC_CHANNELS.engineGetStatus),
  },
  companion: {
    show: () => ipcRenderer.invoke(IPC_CHANNELS.companionShow),
    hide: () => ipcRenderer.invoke(IPC_CHANNELS.companionHide),
    setState: (state: CompanionState) =>
      ipcRenderer.invoke(IPC_CHANNELS.companionSetState, state),
    setInteractive: (interactive: boolean) =>
      ipcRenderer.invoke(IPC_CHANNELS.companionSetInteractive, interactive),
  },
  window: {
    toggleMaximize: () => ipcRenderer.invoke(IPC_CHANNELS.windowToggleMaximize),
  },
  screen: {
    getActiveApp: () => ipcRenderer.invoke(IPC_CHANNELS.screenGetActiveApp),
    captureActiveWindow: () =>
      ipcRenderer.invoke(IPC_CHANNELS.screenCaptureActiveWindow),
  },
  permissions: {
    getStatus: () => ipcRenderer.invoke(IPC_CHANNELS.permissionsGetStatus),
    openSystemSettings: (permission: PermissionKind) =>
      ipcRenderer.invoke(IPC_CHANNELS.permissionsOpenSystemSettings, permission),
  },
  shell: {
    openExternal: (url: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.shellOpenExternal, url),
  },
};

contextBridge.exposeInMainWorld("stageDesktop", stageDesktop);
