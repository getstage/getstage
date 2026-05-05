import { contextBridge, ipcRenderer } from "electron";
import { IPC_CHANNELS } from "@shared/ipc/channels";
import type { CompanionState, PermissionKind } from "@shared/models/desktop";

const stageDesktop = {
  auth: {
    openLogin: () => ipcRenderer.invoke(IPC_CHANNELS.authOpenLogin),
    getSession: () => ipcRenderer.invoke(IPC_CHANNELS.authGetSession),
  },
  companion: {
    show: () => ipcRenderer.invoke(IPC_CHANNELS.companionShow),
    hide: () => ipcRenderer.invoke(IPC_CHANNELS.companionHide),
    setState: (state: CompanionState) =>
      ipcRenderer.invoke(IPC_CHANNELS.companionSetState, state),
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
};

contextBridge.exposeInMainWorld("stageDesktop", stageDesktop);
