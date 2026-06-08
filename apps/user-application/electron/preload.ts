import { contextBridge, ipcRenderer } from "electron";
import { IPC_CHANNELS } from "@shared/ipc/channels";
import type {
  CompanionState,
  DesktopSession,
  DesktopShortcutSettings,
  DesktopShortcutSettingsResult,
  DesktopUpdateStatus,
  IntegrationOAuthResult,
  PermissionKind,
} from "@shared/models/desktop";
import type {
  RunEvent,
  StartRunRequest,
  VoiceTranscriptResponse,
  VoiceTranscriptionRequest,
} from "@stage/data-ops/contracts";

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
    listProviders: () => ipcRenderer.invoke(IPC_CHANNELS.engineListProviders),
    refreshProviders: () => ipcRenderer.invoke(IPC_CHANNELS.engineRefreshProviders),
    updateProvider: (providerId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.engineUpdateProvider, providerId),
    startRun: (request: StartRunRequest) =>
      ipcRenderer.invoke(IPC_CHANNELS.engineStartRun, request),
    cancelRun: (runId: string) => ipcRenderer.invoke(IPC_CHANNELS.engineCancelRun, runId),
    onRunEvent: (callback: (event: RunEvent) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, runEvent: RunEvent) => {
        callback(runEvent);
      };

      ipcRenderer.on(IPC_CHANNELS.engineRunEvent, listener);
      return () => {
        ipcRenderer.off(IPC_CHANNELS.engineRunEvent, listener);
      };
    },
  },
  companion: {
    show: () => ipcRenderer.invoke(IPC_CHANNELS.companionShow),
    hide: () => ipcRenderer.invoke(IPC_CHANNELS.companionHide),
    setState: (state: CompanionState) =>
      ipcRenderer.invoke(IPC_CHANNELS.companionSetState, state),
    setInteractive: (interactive: boolean) =>
      ipcRenderer.invoke(IPC_CHANNELS.companionSetInteractive, interactive),
  },
  voice: {
    getStatus: (providerPreferences?: { claude: boolean; codex: boolean }) =>
      ipcRenderer.invoke(IPC_CHANNELS.voiceGetStatus, providerPreferences),
    transcribe: (input: VoiceTranscriptionRequest): Promise<VoiceTranscriptResponse> =>
      ipcRenderer.invoke(IPC_CHANNELS.voiceTranscribe, input),
    getSettings: (): Promise<DesktopShortcutSettingsResult> =>
      ipcRenderer.invoke(IPC_CHANNELS.voiceGetSettings),
    updateSettings: (settings: DesktopShortcutSettings): Promise<DesktopShortcutSettingsResult> =>
      ipcRenderer.invoke(IPC_CHANNELS.voiceUpdateSettings, settings),
    onStartStopRecordingShortcut: (callback: () => void) => {
      const listener = () => {
        callback();
      };

      ipcRenderer.on(IPC_CHANNELS.voiceShortcutStartStopRecording, listener);
      return () => {
        ipcRenderer.off(IPC_CHANNELS.voiceShortcutStartStopRecording, listener);
      };
    },
    onOpenLatestChatShortcut: (callback: () => void) => {
      const listener = () => {
        callback();
      };

      ipcRenderer.on(IPC_CHANNELS.voiceShortcutOpenLatestChat, listener);
      return () => {
        ipcRenderer.off(IPC_CHANNELS.voiceShortcutOpenLatestChat, listener);
      };
    },
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
    requestMicrophone: () => ipcRenderer.invoke(IPC_CHANNELS.permissionsRequestMicrophone),
    openSystemSettings: (permission: PermissionKind) =>
      ipcRenderer.invoke(IPC_CHANNELS.permissionsOpenSystemSettings, permission),
  },
  shell: {
    openExternal: (url: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.shellOpenExternal, url),
  },
  integrations: {
    getOAuthReturnUrl: (provider: "figma" | "notion") =>
      ipcRenderer.invoke(IPC_CHANNELS.integrationsGetOAuthReturnUrl, provider),
    onOAuthCompleted: (callback: (result: IntegrationOAuthResult) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, result: IntegrationOAuthResult) => {
        callback(result);
      };

      ipcRenderer.on(IPC_CHANNELS.integrationOAuthCompleted, listener);
      return () => {
        ipcRenderer.off(IPC_CHANNELS.integrationOAuthCompleted, listener);
      };
    },
  },
  updates: {
    getStatus: (): Promise<DesktopUpdateStatus> =>
      ipcRenderer.invoke(IPC_CHANNELS.updatesGetStatus),
    check: (): Promise<DesktopUpdateStatus> =>
      ipcRenderer.invoke(IPC_CHANNELS.updatesCheck),
    install: (): Promise<DesktopUpdateStatus> =>
      ipcRenderer.invoke(IPC_CHANNELS.updatesInstall),
    onStatusChanged: (callback: (status: DesktopUpdateStatus) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, status: DesktopUpdateStatus) => {
        callback(status);
      };

      ipcRenderer.on(IPC_CHANNELS.updatesStatusChanged, listener);
      return () => {
        ipcRenderer.off(IPC_CHANNELS.updatesStatusChanged, listener);
      };
    },
  },
};

contextBridge.exposeInMainWorld("stageDesktop", stageDesktop);
