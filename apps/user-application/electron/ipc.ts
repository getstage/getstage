import { app, BrowserWindow, ipcMain, shell } from "electron";
import { IPC_CHANNELS } from "@shared/ipc/channels";
import {
  companionStateSchema,
  desktopSessionSchema,
  engineStatusSchema,
  permissionKindSchema,
  type ActiveAppInfo,
  type DesktopPermissionStatus,
  type DesktopSession,
} from "@shared/models/desktop";
import { defaultPermissionStatus } from "./helpers/permissions";
import {
  createTask as desktopApiCreateTask,
  deleteTask as desktopApiDeleteTask,
  getProject as desktopApiGetProject,
  listPhaseTasks as desktopApiListPhaseTasks,
  listProjectPhases as desktopApiListProjectPhases,
  listProjects as desktopApiListProjects,
  listUserTasks as desktopApiListUserTasks,
  setTaskPriority as desktopApiSetTaskPriority,
} from "./desktop-api";
import { getSelectedProjectContext } from "./project-context";
import { closeCompanionWindow, setCompanionWindowInteractive } from "./windows";
import type { SidecarSupervisor } from "./sidecar";
import type { DesktopAuthController } from "./auth";

type RegisterIpcHandlersOptions = {
  authController: DesktopAuthController;
  sidecarSupervisor: SidecarSupervisor;
};

export function registerIpcHandlers({
  authController,
  sidecarSupervisor,
}: RegisterIpcHandlersOptions) {
  ipcMain.handle(IPC_CHANNELS.authOpenLogin, async () => {
    await authController.openLogin();
  });

  ipcMain.handle(IPC_CHANNELS.authLogout, async () => {
    await authController.signOut();
  });

  ipcMain.handle(IPC_CHANNELS.authGetSession, async (): Promise<DesktopSession | null> => {
    const session = await authController.getSession();

    return session ? desktopSessionSchema.parse(session) : null;
  });

  ipcMain.handle(IPC_CHANNELS.authGetAccessToken, async (): Promise<string | null> => {
    return authController.getAccessToken();
  });

  ipcMain.handle(IPC_CHANNELS.projectContextGetSelected, async () => {
    return getSelectedProjectContext(authController);
  });

  // Every desktop-api fetcher accepts `unknown` and Zod-parses internally.
  // The IPC handlers below pass through without casting or hand-rolled
  // narrowing - bad input throws a typed Zod error at the boundary.

  ipcMain.handle(IPC_CHANNELS.desktopApiListProjects, async () => {
    return desktopApiListProjects(authController);
  });

  ipcMain.handle(IPC_CHANNELS.desktopApiGetProject, async (_event, projectId: unknown) => {
    return desktopApiGetProject(authController, projectId);
  });

  ipcMain.handle(IPC_CHANNELS.desktopApiListProjectPhases, async (_event, projectId: unknown) => {
    return desktopApiListProjectPhases(authController, projectId);
  });

  ipcMain.handle(IPC_CHANNELS.desktopApiListPhaseTasks, async (_event, phaseId: unknown) => {
    return desktopApiListPhaseTasks(authController, phaseId);
  });

  ipcMain.handle(IPC_CHANNELS.desktopApiListUserTasks, async (_event, args: unknown) => {
    return desktopApiListUserTasks(authController, args);
  });

  ipcMain.handle(IPC_CHANNELS.desktopApiCreateTask, async (_event, args: unknown) => {
    return desktopApiCreateTask(authController, args);
  });

  ipcMain.handle(IPC_CHANNELS.desktopApiDeleteTask, async (_event, taskId: unknown) => {
    return desktopApiDeleteTask(authController, taskId);
  });

  ipcMain.handle(IPC_CHANNELS.desktopApiSetTaskPriority, async (_event, args: unknown) => {
    return desktopApiSetTaskPriority(authController, args);
  });

  ipcMain.handle(IPC_CHANNELS.engineGetStatus, () => {
    return engineStatusSchema.parse(sidecarSupervisor.getStatus());
  });

  ipcMain.handle(IPC_CHANNELS.companionShow, () => {
    return { ok: true };
  });

  ipcMain.handle(IPC_CHANNELS.companionHide, () => {
    closeCompanionWindow();
    return { ok: true };
  });

  ipcMain.handle(IPC_CHANNELS.companionSetState, (_event, state: unknown) => {
    companionStateSchema.parse(state);
    return { ok: true };
  });

  ipcMain.handle(IPC_CHANNELS.companionSetInteractive, (_event, interactive: unknown) => {
    if (typeof interactive !== "boolean") {
      throw new Error("Companion interactivity must be a boolean.");
    }

    setCompanionWindowInteractive(interactive);
    return { ok: true };
  });

  ipcMain.handle(IPC_CHANNELS.windowToggleMaximize, (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);

    if (!window) {
      return { ok: false };
    }

    if (window.isMaximized()) {
      window.unmaximize();
    } else {
      window.maximize();
    }

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

  ipcMain.handle(IPC_CHANNELS.shellOpenExternal, async (_event, url: unknown) => {
    if (typeof url !== "string") {
      throw new Error("External URL must be a string.");
    }

    const parsedUrl = new URL(url);
    if (parsedUrl.protocol !== "https:") {
      throw new Error("Only HTTPS external URLs are allowed.");
    }

    await shell.openExternal(parsedUrl.toString());
  });
}
