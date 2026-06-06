import { app, BrowserWindow, ipcMain, shell, type WebContents } from "electron";
import {
  cancelRunResponseSchema,
  providerIdSchema,
  providerListResponseSchema,
  providerUpdateResponseSchema,
  runEventSchema,
  startRunRequestSchema,
  startRunResponseSchema,
  type ProviderId,
  type RunEvent,
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
import {
  getDesktopPermissionStatus,
  openPermissionSystemSettings,
  requestMicrophoneAccess,
} from "./helpers/permissions";
import { fetchEngineJson } from "./helpers/sidecar";
import { closeCompanionWindow, openCompanionFromTray, setCompanionWindowInteractive } from "./windows";
import type { SidecarSupervisor } from "./sidecar";
import type { DesktopAuthController } from "./auth";
import type { DesktopIntegrationsController } from "./integrations";

const activeRunStreams = new Map<string, AbortController>();
const shouldLogDesktopDebug =
  process.env.STAGE_DESKTOP_DEBUG === "1" ||
  (!app.isPackaged && process.env.STAGE_DESKTOP_DEBUG !== "0");

type RegisterIpcHandlersOptions = {
  authController: DesktopAuthController;
  integrationsController: DesktopIntegrationsController;
  sidecarSupervisor: SidecarSupervisor;
};

function debugDesktop(message: string) {
  if (shouldLogDesktopDebug) {
    console.info(`[stage-desktop:debug] ${message}`);
  }
}

async function withDebugTiming<T>(label: string, task: () => Promise<T>): Promise<T> {
  const startedAt = performance.now();
  debugDesktop(`${label} started`);

  try {
    const result = await task();
    debugDesktop(`${label} completed in ${Math.round(performance.now() - startedAt)}ms`);
    return result;
  } catch (error) {
    debugDesktop(`${label} failed after ${Math.round(performance.now() - startedAt)}ms`);
    throw error;
  }
}

export function registerIpcHandlers({
  authController,
  integrationsController,
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

  ipcMain.handle(IPC_CHANNELS.engineGetStatus, async () => {
    return withDebugTiming("engine:get-status", async () =>
      engineStatusSchema.parse(await sidecarSupervisor.getLiveStatus()),
    );
  });

  ipcMain.handle(IPC_CHANNELS.engineListProviders, async () => {
    return withDebugTiming("engine:list-providers", async () => {
      const status = await withDebugTiming("engine:list-providers sidecar-start", () =>
        sidecarSupervisor.start(),
      );
      const payload = await withDebugTiming("engine:list-providers fetch", () =>
        fetchEngineJson<unknown>({
          path: "/v1/providers",
          port: status.port,
        }),
      );

      return providerListResponseSchema.parse(payload);
    });
  });

  ipcMain.handle(IPC_CHANNELS.engineRefreshProviders, async () => {
    return withDebugTiming("engine:refresh-providers", async () => {
      const status = await withDebugTiming("engine:refresh-providers sidecar-start", () =>
        sidecarSupervisor.start(),
      );
      const payload = await withDebugTiming("engine:refresh-providers fetch", () =>
        fetchEngineJson<unknown>({
          method: "POST",
          path: "/v1/providers/refresh",
          port: status.port,
        }),
      );

      return providerListResponseSchema.parse(payload);
    });
  });

  ipcMain.handle(IPC_CHANNELS.engineUpdateProvider, async (_event, providerId: unknown) => {
    const parsedProviderId = providerIdSchema.parse(providerId);
    return withDebugTiming(`engine:update-provider provider=${parsedProviderId}`, async () => {
      const status = await withDebugTiming("engine:update-provider sidecar-start", () =>
        sidecarSupervisor.start(),
      );
      const payload = await withDebugTiming("engine:update-provider fetch", () =>
        fetchEngineJson<unknown>({
          method: "POST",
          path: `/v1/providers/${parsedProviderId}/update`,
          port: status.port,
        }),
      );

      return providerUpdateResponseSchema.parse(payload);
    });
  });

  ipcMain.handle(IPC_CHANNELS.engineStartRun, async (event, request: unknown) => {
    const parsedRequest = startRunRequestSchema.parse(request);
    console.info(
      `[stage-engine] run request provider=${parsedRequest.providerId} mode=${parsedRequest.mode} projectId=${parsedRequest.context.projectId ?? "none"}`,
    );
    const status = await withDebugTiming("engine:start-run sidecar-start", () =>
      sidecarSupervisor.start(),
    );
    const accessToken = await withDebugTiming("engine:start-run access-token", () =>
      authController.getAccessToken(),
    );
    const payload = await withDebugTiming("engine:start-run fetch", () =>
      fetchEngineJson<unknown>({
        method: "POST",
        path: "/v1/runs",
        port: status.port,
        body: parsedRequest,
        accessToken,
      }),
    );
    const response = startRunResponseSchema.parse(payload);

    void streamRunEventsToRenderer({
      accessToken,
      port: status.port,
      runId: response.runId,
      providerId: parsedRequest.providerId,
      sender: event.sender,
    });

    return response;
  });

  ipcMain.handle(IPC_CHANNELS.engineCancelRun, async (_event, runId: unknown) => {
    if (typeof runId !== "string" || runId.length === 0) {
      throw new Error("Run id must be a non-empty string.");
    }

    return withDebugTiming(`engine:cancel-run runId=${runId}`, async () => {
      const status = await withDebugTiming("engine:cancel-run sidecar-start", () =>
        sidecarSupervisor.start(),
      );
      const payload = await withDebugTiming("engine:cancel-run fetch", () =>
        fetchEngineJson<unknown>({
          method: "POST",
          path: `/v1/runs/${encodeURIComponent(runId)}/cancel`,
          port: status.port,
        }),
      );

      return cancelRunResponseSchema.parse(payload);
    });
  });

  ipcMain.handle(IPC_CHANNELS.companionShow, () => {
    openCompanionFromTray();
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
    return getDesktopPermissionStatus();
  });

  ipcMain.handle(IPC_CHANNELS.permissionsRequestMicrophone, async () => {
    return requestMicrophoneAccess();
  });

  ipcMain.handle(IPC_CHANNELS.permissionsOpenSystemSettings, async (_event, permission: unknown) => {
    const kind = permissionKindSchema.parse(permission);
    await openPermissionSystemSettings(kind);
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

  ipcMain.handle(IPC_CHANNELS.integrationsGetOAuthReturnUrl, (_event, provider: unknown) => {
    if (provider !== "figma" && provider !== "notion") {
      throw new Error("Integration provider must be figma or notion.");
    }

    return integrationsController.getOAuthReturnUrl(provider);
  });
}

async function streamRunEventsToRenderer(args: {
  accessToken?: string | null;
  port: number;
  runId: string;
  providerId: ProviderId;
  sender: WebContents;
}) {
  activeRunStreams.get(args.runId)?.abort();

  const controller = new AbortController();
  activeRunStreams.set(args.runId, controller);
  let sawTerminalEvent = false;

  try {
    const response = await fetch(
      `http://127.0.0.1:${args.port}/v1/runs/${encodeURIComponent(args.runId)}/events`,
      {
        headers: args.accessToken
          ? { authorization: `Bearer ${args.accessToken}` }
          : undefined,
        signal: controller.signal,
      },
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
        logRunEvent(runEvent);
        args.sender.send(IPC_CHANNELS.engineRunEvent, runEvent);

        if (
          runEvent.type === "run_completed" ||
          runEvent.type === "run_failed" ||
          runEvent.type === "run_cancelled"
        ) {
          sawTerminalEvent = true;
          controller.abort();
          break;
        }
      }
    }
  } catch (error) {
    if (!controller.signal.aborted) {
      console.error("[stage-engine] run event stream failed", error);
    }
  } finally {
    if (!sawTerminalEvent && !controller.signal.aborted) {
      emitSyntheticRunFailed(args, "The research run ended before Stage received a final status.");
    }
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

  let json: unknown;
  try {
    json = JSON.parse(data);
  } catch (error) {
    console.warn("[stage-engine] skipped non-JSON run event block", error);
    return null;
  }

  const parsed = runEventSchema.safeParse(json);
  if (!parsed.success) {
    console.warn("[stage-engine] skipped invalid run event", parsed.error.flatten());
    return null;
  }

  return parsed.data;
}

function emitSyntheticRunFailed(
  args: {
    runId: string;
    providerId: ProviderId;
    sender: WebContents;
  },
  detail: string,
) {
  const event = runEventSchema.parse({
    apiVersion: "v1",
    type: "run_failed",
    runId: args.runId,
    providerId: args.providerId,
    createdAt: Date.now(),
    error: {
      code: "io_error",
      message: "The selected AI provider could not finish the research run.",
      providerId: args.providerId,
      retryable: true,
      detail,
    },
  } satisfies RunEvent);

  console.error(`[stage-engine] ${JSON.stringify(event)}`);
  args.sender.send(IPC_CHANNELS.engineRunEvent, event);
}

function logRunEvent(event: RunEvent) {
  const payload = JSON.stringify(event);
  switch (event.type) {
    case "run_failed":
      console.error(`[stage-engine] ${payload}`);
      return;
    case "run_cancelled":
    case "provider_warning":
      console.warn(`[stage-engine] ${payload}`);
      return;
    default:
      console.info(`[stage-engine] ${payload}`);
  }
}
