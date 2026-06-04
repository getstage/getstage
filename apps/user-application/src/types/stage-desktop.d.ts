import type {
  ActiveAppInfo,
  CaptureResult,
  CompanionState,
  DesktopPermissionStatus,
  DesktopSession,
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
    transcribe: (input: VoiceTranscriptionRequest) => Promise<VoiceTranscriptResponse>;
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
    openSystemSettings: (permission: PermissionKind) => Promise<void>;
  };
  shell: {
    openExternal: (url: string) => Promise<void>;
  };
  integrations: {
    getOAuthReturnUrl: (provider: "figma" | "notion") => Promise<string>;
    onOAuthCompleted: (callback: (result: IntegrationOAuthResult) => void) => () => void;
  };
};

declare global {
  interface Window {
    stageDesktop: StageDesktopApi;
  }
}

export {};
