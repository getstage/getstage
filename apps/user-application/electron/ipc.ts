import { app, BrowserWindow, ipcMain, shell, type WebContents } from "electron";
import {
  cancelRunResponseSchema,
  providerIdSchema,
  providerListResponseSchema,
  providerUpdateResponseSchema,
  runEventSchema,
  startRunRequestSchema,
  startRunResponseSchema,
} from "@stage/data-ops/contracts";
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
import { fetchEngineJson } from "./helpers/sidecar";
import { closeCompanionWindow, setCompanionWindowInteractive } from "./windows";
import type { SidecarSupervisor } from "./sidecar";
import type { DesktopAuthController } from "./auth";

const activeRunStreams = new Map<string, AbortController>();

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

  ipcMain.handle(IPC_CHANNELS.engineGetStatus, () => {
    return engineStatusSchema.parse(sidecarSupervisor.getStatus());
  });

  ipcMain.handle(IPC_CHANNELS.engineListProviders, async () => {
    const status = await sidecarSupervisor.start();
    const payload = await fetchEngineJson<unknown>({
      path: "/v1/providers",
      port: status.port,
    });

    return providerListResponseSchema.parse(payload);
  });

  ipcMain.handle(IPC_CHANNELS.engineRefreshProviders, async () => {
    const status = await sidecarSupervisor.start();
    const payload = await fetchEngineJson<unknown>({
      method: "POST",
      path: "/v1/providers/refresh",
      port: status.port,
    });

    return providerListResponseSchema.parse(payload);
  });

  ipcMain.handle(IPC_CHANNELS.engineUpdateProvider, async (_event, providerId: unknown) => {
    const parsedProviderId = providerIdSchema.parse(providerId);
    const status = await sidecarSupervisor.start();
    const payload = await fetchEngineJson<unknown>({
      method: "POST",
      path: `/v1/providers/${parsedProviderId}/update`,
      port: status.port,
    });

    return providerUpdateResponseSchema.parse(payload);
  });

  ipcMain.handle(IPC_CHANNELS.engineStartRun, async (event, request: unknown) => {
    const parsedRequest = startRunRequestSchema.parse(request);
    const status = await sidecarSupervisor.start();
    const payload = await fetchEngineJson<unknown>({
      method: "POST",
      path: "/v1/runs",
      port: status.port,
      body: parsedRequest,
    });
    const response = startRunResponseSchema.parse(payload);

    void streamRunEventsToRenderer({
      port: status.port,
      runId: response.runId,
      sender: event.sender,
    });

    return response;
  });

  ipcMain.handle(IPC_CHANNELS.engineCancelRun, async (_event, runId: unknown) => {
    if (typeof runId !== "string" || runId.length === 0) {
      throw new Error("Run id must be a non-empty string.");
    }

    const status = await sidecarSupervisor.start();
    const payload = await fetchEngineJson<unknown>({
      method: "POST",
      path: `/v1/runs/${encodeURIComponent(runId)}/cancel`,
      port: status.port,
    });

    return cancelRunResponseSchema.parse(payload);
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

async function streamRunEventsToRenderer(args: {
  port: number;
  runId: string;
  sender: WebContents;
}) {
  activeRunStreams.get(args.runId)?.abort();

  const controller = new AbortController();
  activeRunStreams.set(args.runId, controller);

  try {
    const response = await fetch(
      `http://127.0.0.1:${args.port}/v1/runs/${encodeURIComponent(args.runId)}/events`,
      { signal: controller.signal },
    );

    if (!response.ok || !response.body) {
      throw new Error(`Run event stream failed with ${response.status}.`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (!controller.signal.aborted) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const blocks = buffer.split(/\r?\n\r?\n/);
      buffer = blocks.pop() ?? "";

      for (const block of blocks) {
        const runEvent = parseRunEventBlock(block);
        if (!runEvent) {
          continue;
        }

        args.sender.send(IPC_CHANNELS.engineRunEvent, runEvent);

        if (
          runEvent.type === "run_completed" ||
          runEvent.type === "run_failed" ||
          runEvent.type === "run_cancelled"
        ) {
          controller.abort();
          break;
        }
      }
    }
  } catch (error) {
    if (!controller.signal.aborted) {
      console.warn("[Stage Engine] Run event stream failed", error);
    }
  } finally {
    activeRunStreams.delete(args.runId);
  }
}

function parseRunEventBlock(block: string) {
  const data = block
    .split(/\r?\n/)
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice("data:".length).trimStart())
    .join("\n");

  if (!data) {
    return null;
  }

  return runEventSchema.parse(JSON.parse(data));
}
