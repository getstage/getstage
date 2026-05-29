import type {
  ActiveAppInfo,
  CaptureResult,
  CompanionState,
  DesktopPermissionStatus,
  DesktopSession,
  EngineStatus,
  PermissionKind,
} from "@shared/models/desktop";

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
  };
  companion: {
    show: () => Promise<void>;
    hide: () => Promise<void>;
    setState: (state: CompanionState) => Promise<void>;
    setInteractive: (interactive: boolean) => Promise<void>;
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
};

declare global {
  interface Window {
    stageDesktop: StageDesktopApi;
  }
}

export {};
