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
    getSession: () => Promise<DesktopSession | null>;
  };
  engine: {
    getStatus: () => Promise<EngineStatus>;
  };
  companion: {
    show: () => Promise<void>;
    hide: () => Promise<void>;
    setState: (state: CompanionState) => Promise<void>;
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
};

declare global {
  interface Window {
    stageDesktop: StageDesktopApi;
  }
}

export {};
