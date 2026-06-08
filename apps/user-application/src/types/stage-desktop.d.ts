import type {
  ActiveAppInfo,
  CaptureResult,
  CompanionState,
  DesktopPermissionStatus,
  DesktopSession,
  DesktopShortcutSettings,
  DesktopShortcutSettingsResult,
  DesktopUpdateStatus,
  EngineStatus,
  IntegrationOAuthResult,
  PermissionKind,
} from "@shared/models/desktop";
import type {
  ProviderId,
  ProviderListResponse,
  ProviderUpdateResponse,
  RunEvent,
  StartRunRequest,
  StartRunResponse,
  CancelRunResponse,
  VoiceTranscriptResponse,
  VoiceTranscriptionRequest,
} from "@stage/data-ops/contracts";
import type { VoiceTranscriptionStatus } from "@shared/models/desktop";

export type StageDesktopApi = {
  auth: {
    openLogin: () => Promise<void>;
    logout: () => Promise<void>;
    getSession: () => Promise<DesktopSession | null>;
    getAccessToken: () => Promise<string | null>;
    onSessionChanged: (callback: (session: DesktopSession | null) => void) => () => void;
  };
  engine: {
    getStatus: () => Promise<EngineStatus>;
    listProviders: () => Promise<ProviderListResponse>;
    refreshProviders: () => Promise<ProviderListResponse>;
    updateProvider: (providerId: ProviderId) => Promise<ProviderUpdateResponse>;
    startRun: (request: StartRunRequest) => Promise<StartRunResponse>;
    cancelRun: (runId: string) => Promise<CancelRunResponse>;
    onRunEvent: (callback: (event: RunEvent) => void) => () => void;
  };
  companion: {
    show: () => Promise<void>;
    hide: () => Promise<void>;
    setState: (state: CompanionState) => Promise<void>;
    setInteractive: (interactive: boolean) => Promise<void>;
  };
  voice: {
    getStatus: (providerPreferences?: {
      claude: boolean;
      codex: boolean;
    }) => Promise<VoiceTranscriptionStatus>;
    transcribe: (input: VoiceTranscriptionRequest) => Promise<VoiceTranscriptResponse>;
    getSettings: () => Promise<DesktopShortcutSettingsResult>;
    updateSettings: (settings: DesktopShortcutSettings) => Promise<DesktopShortcutSettingsResult>;
    onStartStopRecordingShortcut: (callback: () => void) => () => void;
    onOpenLatestChatShortcut: (callback: () => void) => () => void;
  };
  window: {
    toggleMaximize: () => Promise<void>;
  };
  screen: {
    getActiveApp: () => Promise<ActiveAppInfo>;
    captureActiveWindow: () => Promise<CaptureResult>;
  };
  permissions: {
    getStatus: () => Promise<DesktopPermissionStatus>;
    requestMicrophone: () => Promise<boolean>;
    openSystemSettings: (permission: PermissionKind) => Promise<void>;
  };
  shell: {
    openExternal: (url: string) => Promise<void>;
  };
  integrations: {
    getOAuthReturnUrl: (provider: "figma" | "notion") => Promise<string>;
    onOAuthCompleted: (callback: (result: IntegrationOAuthResult) => void) => () => void;
  };
  updates: {
    getStatus: () => Promise<DesktopUpdateStatus>;
    check: () => Promise<DesktopUpdateStatus>;
    install: () => Promise<DesktopUpdateStatus>;
    onStatusChanged: (callback: (status: DesktopUpdateStatus) => void) => () => void;
  };
};

declare global {
  interface Window {
    stageDesktop: StageDesktopApi;
  }
}

export {};
