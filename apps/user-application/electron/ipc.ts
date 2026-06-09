import { mkdir, writeFile } from "node:fs/promises";
import { basename, resolve, sep } from "node:path";
import { app, BrowserWindow, dialog, ipcMain, shell, type WebContents } from "electron";
import {
  cancelRunResponseSchema,
  createFigmaExportRequestSchema,
  createFigmaExportResponseSchema,
  createFigJamExportRequestSchema,
  createCodeExportResponseSchema,
  createPaperExportResponseSchema,
  saveCodeExportResponseSchema,
  wireframeDeliveryRequestSchema,
  providerIdSchema,
  providerListResponseSchema,
  providerUpdateResponseSchema,
  runEventSchema,
  startRunRequestSchema,
  startRunResponseSchema,
  type ProviderId,
  type RunEvent,
} from "@stage/data-ops/contracts";
import { putSignedR2Upload } from "./helpers/r2-upload";
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
import {
  checkForUpdates,
  getDesktopUpdateStatusForRenderer,
  installAvailableUpdate,
} from "./helpers/auto-update";

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

async function withEngineActivity<T>(
  sidecarSupervisor: SidecarSupervisor,
  task: () => Promise<T>,
): Promise<T> {
  sidecarSupervisor.markEngineActivity();
  return task();
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
    return withDebugTiming("engine:list-providers", async () =>
      withEngineActivity(sidecarSupervisor, async () => {
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
      }),
    );
  });

  ipcMain.handle(IPC_CHANNELS.engineRefreshProviders, async () => {
    return withDebugTiming("engine:refresh-providers", async () =>
      withEngineActivity(sidecarSupervisor, async () => {
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
      }),
    );
  });

  ipcMain.handle(IPC_CHANNELS.engineUpdateProvider, async (_event, providerId: unknown) => {
    const parsedProviderId = providerIdSchema.parse(providerId);
    return withDebugTiming(`engine:update-provider provider=${parsedProviderId}`, async () =>
      withEngineActivity(sidecarSupervisor, async () => {
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
      }),
    );
  });

  ipcMain.handle(IPC_CHANNELS.engineStartRun, async (event, request: unknown) => {
    const parsedRequest = startRunRequestSchema.parse(request);
    console.info(
      `[stage-engine] run request provider=${parsedRequest.providerId} mode=${parsedRequest.mode} projectId=${parsedRequest.context.projectId ?? "none"}`,
    );
    sidecarSupervisor.markEngineActivity();
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
      sidecarSupervisor,
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

    return withDebugTiming(`engine:cancel-run runId=${runId}`, async () =>
      withEngineActivity(sidecarSupervisor, async () => {
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
      }),
    );
  });

  ipcMain.handle(IPC_CHANNELS.engineCreateFigmaExport, async (_event, request: unknown) => {
    const parsedRequest = createFigmaExportRequestSchema.parse(request);
    sidecarSupervisor.markEngineActivity();
    const status = await sidecarSupervisor.start();
    const accessToken = await authController.getAccessToken();
    const payload = await fetchEngineJson<unknown>({
      method: "POST",
      path: "/v1/exports/figma",
      port: status.port,
      body: parsedRequest,
      accessToken,
      timeoutMs: 10_000,
    });
    return createFigmaExportResponseSchema.parse(payload);
  });

  ipcMain.handle(IPC_CHANNELS.engineCreateFigJamExport, async (_event, request: unknown) => {
    const parsedRequest = createFigJamExportRequestSchema.parse(request);
    sidecarSupervisor.markEngineActivity();
    const status = await sidecarSupervisor.start();
    const accessToken = await authController.getAccessToken();
    const payload = await fetchEngineJson<unknown>({
      method: "POST",
      path: "/v1/exports/figjam",
      port: status.port,
      body: parsedRequest,
      accessToken,
      timeoutMs: 10_000,
    });
    return createFigmaExportResponseSchema.parse(payload);
  });

  ipcMain.handle(IPC_CHANNELS.engineExportWireframeCode, async (_event, request: unknown) => {
    const parsedRequest = wireframeDeliveryRequestSchema.parse(request);
    sidecarSupervisor.markEngineActivity();
    const status = await sidecarSupervisor.start();
    const accessToken = await authController.getAccessToken();
    const bundle = createCodeExportResponseSchema.parse(
      await fetchEngineJson<unknown>({
        method: "POST",
        path: "/v1/exports/code",
        port: status.port,
        body: parsedRequest,
        accessToken,
        timeoutMs: 10_000,
      }),
    );
    const selection = await dialog.showOpenDialog({
      title: "Choose where to export the Stage wireframe",
      buttonLabel: "Export Code",
      properties: ["openDirectory", "createDirectory"],
    });
    if (selection.canceled || !selection.filePaths[0]) {
      return saveCodeExportResponseSchema.parse({
        apiVersion: "v1",
        cancelled: true,
        fileCount: 0,
      });
    }

    const directoryPath = resolve(selection.filePaths[0], basename(bundle.suggestedDirectoryName));
    await mkdir(directoryPath, { recursive: true });
    for (const file of bundle.files) {
      const filePath = resolve(directoryPath, file.relativePath);
      if (!filePath.startsWith(`${directoryPath}${sep}`)) {
        throw new Error("Stage Engine returned an unsafe code export path.");
      }
      await mkdir(resolve(filePath, ".."), { recursive: true });
      await writeFile(filePath, file.content, "utf8");
    }
    return saveCodeExportResponseSchema.parse({
      apiVersion: "v1",
      cancelled: false,
      directoryPath,
      fileCount: bundle.files.length,
    });
  });

  ipcMain.handle(IPC_CHANNELS.engineCreatePaperExport, async (_event, request: unknown) => {
    const parsedRequest = wireframeDeliveryRequestSchema.parse(request);
    sidecarSupervisor.markEngineActivity();
    const status = await sidecarSupervisor.start();
    const accessToken = await authController.getAccessToken();
    const payload = await fetchEngineJson<unknown>({
      method: "POST",
      path: "/v1/exports/paper",
      port: status.port,
      body: parsedRequest,
      accessToken,
      timeoutMs: 40_000,
    });
    return createPaperExportResponseSchema.parse(payload);
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

  ipcMain.handle(IPC_CHANNELS.updatesGetStatus, () => {
    return getDesktopUpdateStatusForRenderer();
  });

  ipcMain.handle(IPC_CHANNELS.updatesCheck, async () => {
    return checkForUpdates({ manual: true });
  });

  ipcMain.handle(IPC_CHANNELS.updatesInstall, async () => {
    return installAvailableUpdate();
  });

  ipcMain.handle(IPC_CHANNELS.storagePutR2Upload, async (_event, request: unknown) => {
    if (!request || typeof request !== "object") {
      throw new Error("R2 upload request is required.");
    }

    const { uploadUrl, mimeType, bytes } = request as {
      uploadUrl?: unknown;
      mimeType?: unknown;
      bytes?: unknown;
    };

    if (typeof uploadUrl !== "string" || uploadUrl.trim().length === 0) {
      throw new Error("R2 upload URL is required.");
    }

    if (typeof mimeType !== "string" || mimeType.trim().length === 0) {
      throw new Error("R2 upload mime type is required.");
    }

    if (!(bytes instanceof Uint8Array) && !Array.isArray(bytes)) {
      throw new Error("R2 upload payload is required.");
    }

    return putSignedR2Upload({
      uploadUrl,
      mimeType,
      bytes: bytes instanceof Uint8Array ? bytes : bytes,
    });
  });
}

async function streamRunEventsToRenderer(args: {
  sidecarSupervisor: SidecarSupervisor;
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

  args.sidecarSupervisor.holdIdleShutdown();

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

      args.sidecarSupervisor.markEngineActivity();
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
    args.sidecarSupervisor.releaseIdleShutdown();
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
  switch (event.type) {
    case "run_failed":
      console.error(
        `[stage-engine] run failed runId=${event.runId} provider=${event.providerId} ${event.error.message}`,
      );
      return;
    case "run_cancelled":
      console.warn(
        `[stage-engine] run cancelled runId=${event.runId}${event.reason ? ` reason=${event.reason}` : ""}`,
      );
      return;
    case "provider_warning":
      console.warn(`[stage-engine] provider warning runId=${event.runId} ${event.message}`);
      return;
    case "tool_call_completed":
      if (event.status === "failed") {
        console.error(
          `[stage-engine] tool call failed runId=${event.runId} toolCallId=${event.toolCallId}`,
        );
      }
      return;
    default:
      return;
  }
}
