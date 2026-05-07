import type {
  ActiveAppInfo,
  CaptureResult,
  CompanionState,
  DesktopPermissionStatus,
  DesktopSession,
  EngineStatus,
  PermissionKind,
} from "@shared/models/desktop";
import type { ProjectContext } from "@stage/data-ops";

export type StageDesktopApi = {
  auth: {
    openLogin: () => Promise<void>;
    getSession: () => Promise<DesktopSession | null>;
  };
  projectContext: {
    getSelected: () => Promise<ProjectContext | null>;
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
