import type {
  ActiveAppInfo,
  CaptureResult,
  CompanionState,
  DesktopPermissionStatus,
  DesktopSession,
  EngineStatus,
  PermissionKind,
} from "@shared/models/desktop";
import type {
  PhaseSummary,
  ProjectContext,
  ProjectDetail,
  ProjectSummary,
  TaskPriority,
  TaskSummary,
} from "@stage/data-ops";

export type StageDesktopApi = {
  auth: {
    openLogin: () => Promise<void>;
    logout: () => Promise<void>;
    getSession: () => Promise<DesktopSession | null>;
    onSessionChanged: (callback: (session: DesktopSession | null) => void) => () => void;
  };
  projectContext: {
    getSelected: () => Promise<ProjectContext | null>;
  };
  api: {
    listProjects: () => Promise<ProjectSummary[]>;
    getProject: (projectId: string) => Promise<ProjectDetail>;
    listProjectPhases: (projectId: string) => Promise<PhaseSummary[]>;
    listPhaseTasks: (phaseId: string) => Promise<TaskSummary[]>;
    listUserTasks: (args?: { limit?: number }) => Promise<TaskSummary[]>;
    createTask: (args: {
      projectId: string;
      title: string;
      priority?: TaskPriority;
      content?: string;
    }) => Promise<TaskSummary>;
    deleteTask: (taskId: string) => Promise<{ ok: true }>;
    setTaskPriority: (args: {
      taskId: string;
      priority: TaskPriority | null;
    }) => Promise<TaskSummary>;
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
