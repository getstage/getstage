import { mkdir, writeFile } from "node:fs/promises";
import { basename, resolve, sep } from "node:path";
import { app, BrowserWindow, clipboard, dialog, ipcMain, shell, type WebContents } from "electron";
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
  captureWindowRequestSchema,
  chatAttachmentTargetSchema,
  importChatImageBytesRequestSchema,
  companionStateSchema,
  companionWidgetSettingsSchema,
  desktopSessionSchema,
  engineStatusSchema,
  permissionKindSchema,
  type ActiveAppInfo,
  type DesktopPermissionStatus,
  type DesktopSession,
} from "@shared/models/desktop";
import {
  assertLocalChatAttachmentPaths,
  captureWindowSource,
  deleteChatAttachments,
  importChatImages,
  importChatImageBytes,
  listWindowCaptureSources,
} from "./helpers/chat-attachments";
import {
  getDesktopPermissionStatus,
  openPermissionSystemSettings,
  requestMicrophoneAccess,
} from "./helpers/permissions";
import {
  getCompanionWidgetSettings,
  saveCompanionWidgetSettings,
} from "./helpers/companion-preferences";
import { fetchEngineJsonAuthed } from "./helpers/engine-request";
import { logDesktopDebug, logDesktopInfo } from "./helpers/desktop-log";
import { fetchEngineJson } from "./helpers/sidecar";
import { delay } from "./helpers/time";
import { closeCompanionWindow, openCompanionFromTray, setCompanionWindowInteractive } from "./windows";
import type { SidecarSupervisor } from "./sidecar";
import type { DesktopAuthController } from "./auth";
import type { DesktopIntegrationsController } from "./integrations";
import {
  checkForUpdates,
  getDesktopUpdateStatusForRenderer,
  installAvailableUpdate,
} from "./helpers/auto-update";
import {
  PROVIDER_STATUS_TIMEOUT_MS,
  PROVIDER_UPDATE_TIMEOUT_MS,
  RUN_EVENT_STREAM_MAX_MS,
  RUN_EVENT_STREAM_RECONNECT_DELAY_MS,
} from "./helpers/engine-constants";

const activeRunStreams = new Map<string, AbortController>();

function sendRunEventToRenderer(sender: WebContents, runEvent: RunEvent) {
  if (sender.isDestroyed()) {
    return false;
  }

  sender.send(IPC_CHANNELS.engineRunEvent, runEvent);
  return true;
}

type RegisterIpcHandlersOptions = {
  authController: DesktopAuthController;
  integrationsController: DesktopIntegrationsController;
  sidecarSupervisor: SidecarSupervisor;
};

async function withEngineActivity<T>(
  sidecarSupervisor: SidecarSupervisor,
  task: () => Promise<T>,
): Promise<T> {
  sidecarSupervisor.markEngineActivity();
  return task();
}

async function withDebugTiming<T>(label: string, task: () => Promise<T>): Promise<T> {
  const startedAt = performance.now();
  logDesktopDebug(`${label} started`);

  try {
    const result = await task();
    logDesktopDebug(`${label} completed in ${Math.round(performance.now() - startedAt)}ms`);
    return result;
  } catch (error) {
    logDesktopDebug(`${label} failed after ${Math.round(performance.now() - startedAt)}ms`);
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

  ipcMain.handle(IPC_CHANNELS.clipboardWriteText, (_event, text: unknown) => {
    if (typeof text !== "string") {
      throw new Error("Clipboard text must be a string.");
    }
    clipboard.writeText(text);
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
          timeoutMs: PROVIDER_STATUS_TIMEOUT_MS,
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
          timeoutMs: PROVIDER_STATUS_TIMEOUT_MS,
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
          timeoutMs: PROVIDER_UPDATE_TIMEOUT_MS,
        }),
      );

      return providerUpdateResponseSchema.parse(payload);
      }),
    );
  });

  ipcMain.handle(IPC_CHANNELS.engineStartRun, async (event, request: unknown) => {
    const parsedRequest = startRunRequestSchema.parse(request);
    await assertLocalChatAttachmentPaths(parsedRequest.attachments);
    logDesktopInfo(
      "stage-engine",
      `run request provider=${parsedRequest.providerId} mode=${parsedRequest.mode} projectId=${parsedRequest.context.projectId ?? "none"}`,
    );
    sidecarSupervisor.markEngineActivity();
    const status = await withDebugTiming("engine:start-run sidecar-start", () =>
      sidecarSupervisor.start(),
    );
    const { data: payload, accessToken } = await withDebugTiming("engine:start-run fetch", () =>
      fetchEngineJsonAuthed<unknown>({
        authController,
        method: "POST",
        path: "/v1/runs",
        port: status.port,
        body: parsedRequest,
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
    const { data: payload } = await fetchEngineJsonAuthed<unknown>({
      authController,
      method: "POST",
      path: "/v1/exports/figma",
      port: status.port,
      body: parsedRequest,
      timeoutMs: 10_000,
    });
    return createFigmaExportResponseSchema.parse(payload);
  });

  ipcMain.handle(IPC_CHANNELS.engineCreateFigJamExport, async (_event, request: unknown) => {
    const parsedRequest = createFigJamExportRequestSchema.parse(request);
    sidecarSupervisor.markEngineActivity();
    const status = await sidecarSupervisor.start();
    const { data: payload } = await fetchEngineJsonAuthed<unknown>({
      authController,
      method: "POST",
      path: "/v1/exports/figjam",
      port: status.port,
      body: parsedRequest,
      timeoutMs: 10_000,
    });
    return createFigmaExportResponseSchema.parse(payload);
  });

  ipcMain.handle(IPC_CHANNELS.engineExportWireframeCode, async (_event, request: unknown) => {
    const parsedRequest = wireframeDeliveryRequestSchema.parse(request);
    sidecarSupervisor.markEngineActivity();
    const status = await sidecarSupervisor.start();
    const { data: codeExportPayload } = await fetchEngineJsonAuthed<unknown>({
      authController,
      method: "POST",
      path: "/v1/exports/code",
      port: status.port,
      body: parsedRequest,
      timeoutMs: 10_000,
    });
    const bundle = createCodeExportResponseSchema.parse(codeExportPayload);
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
    const { data: payload } = await fetchEngineJsonAuthed<unknown>({
      authController,
      method: "POST",
      path: "/v1/exports/paper",
      port: status.port,
      body: parsedRequest,
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

  ipcMain.handle(IPC_CHANNELS.companionGetWidgetSettings, () => {
    return companionWidgetSettingsSchema.parse(getCompanionWidgetSettings());
  });

  ipcMain.handle(IPC_CHANNELS.companionSetWidgetSettings, async (_event, settings: unknown) => {
    const parsedSettings = companionWidgetSettingsSchema.parse(settings);
    const savedSettings = await saveCompanionWidgetSettings(parsedSettings);

    if (!savedSettings.allowEverywhere) {
      closeCompanionWindow();
    }

    return savedSettings;
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

  ipcMain.handle(IPC_CHANNELS.screenListWindowSources, async () => {
    return listWindowCaptureSources();
  });

  ipcMain.handle(IPC_CHANNELS.screenCaptureActiveWindow, async (_event, request: unknown) => {
    return captureWindowSource(captureWindowRequestSchema.parse(request));
  });

  ipcMain.handle(IPC_CHANNELS.chatImportImages, async (_event, request: unknown) => {
    return importChatImages(chatAttachmentTargetSchema.parse(request));
  });

  ipcMain.handle(IPC_CHANNELS.chatImportImageBytes, async (_event, request: unknown) => {
    return importChatImageBytes(importChatImageBytesRequestSchema.parse(request));
  });

  ipcMain.handle(IPC_CHANNELS.chatDeleteAttachments, async (_event, request: unknown) => {
    return deleteChatAttachments(chatAttachmentTargetSchema.parse(request));
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

  ipcMain.handle(IPC_CHANNELS.storageOpenLocalFile, async (_event, request: unknown) => {
    if (!request || typeof request !== "object") {
      throw new Error("Local file open request is required.");
    }

    const { fileName, mimeType, bytes } = request as {
      fileName?: unknown;
      mimeType?: unknown;
      bytes?: unknown;
    };

    if (typeof fileName !== "string" || fileName.trim().length === 0) {
      throw new Error("Local file name is required.");
    }

    if (typeof mimeType !== "string" || mimeType.trim().length === 0) {
      throw new Error("Local file mime type is required.");
    }

    if (!(bytes instanceof Uint8Array) && !Array.isArray(bytes)) {
      throw new Error("Local file bytes are required.");
    }

    const safeName = basename(fileName).replace(/[^\w .()[\]-]/g, "_");
    const directory = resolve(app.getPath("temp"), "stage-upload-previews");
    const filePath = resolve(directory, `${Date.now()}-${safeName}`);

    if (!filePath.startsWith(`${directory}${sep}`)) {
      throw new Error("Invalid local file path.");
    }

    await mkdir(directory, { recursive: true });
    await writeFile(filePath, Buffer.from(bytes instanceof Uint8Array ? bytes : bytes));

    const errorMessage = await shell.openPath(filePath);
    if (errorMessage) {
      throw new Error(errorMessage);
    }

    return { ok: true, path: filePath };
  });
}

async function streamRunEventsToRenderer(args: {
  sidecarSupervisor: SidecarSupervisor;
  accessToken: string;
  port: number;
  runId: string;
  providerId: ProviderId;
  sender: WebContents;
}) {
  activeRunStreams.get(args.runId)?.abort();

  const controller = new AbortController();
  activeRunStreams.set(args.runId, controller);
  let sawTerminalEvent = false;
  const streamDeadline = Date.now() + RUN_EVENT_STREAM_MAX_MS;

  args.sidecarSupervisor.holdIdleShutdown();

  try {
    while (!controller.signal.aborted && !sawTerminalEvent && Date.now() < streamDeadline) {
      try {
        sawTerminalEvent = await readRunEventStream(args, controller);
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error("[stage-engine] run event stream failed", error);
        }
      }

      if (!controller.signal.aborted && !sawTerminalEvent && Date.now() < streamDeadline) {
        await delay(RUN_EVENT_STREAM_RECONNECT_DELAY_MS);
      }
    }
  } finally {
    if (!sawTerminalEvent && !controller.signal.aborted) {
      console.warn(
        `[stage-engine] run event stream ended without terminal event runId=${args.runId}; Convex run status remains source of truth`,
      );
    }
    activeRunStreams.delete(args.runId);
    args.sidecarSupervisor.releaseIdleShutdown();
  }
}

async function readRunEventStream(
  args: {
    sidecarSupervisor: SidecarSupervisor;
    accessToken: string;
    port: number;
    runId: string;
    sender: WebContents;
  },
  controller: AbortController,
) {
  const response = await fetch(
    `http://127.0.0.1:${args.port}/v1/runs/${encodeURIComponent(args.runId)}/events`,
    {
      headers: { authorization: `Bearer ${args.accessToken}` },
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
      return false;
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
      if (!sendRunEventToRenderer(args.sender, runEvent)) {
        controller.abort();
        return false;
      }

      if (
        runEvent.type === "run_completed" ||
        runEvent.type === "run_failed" ||
        runEvent.type === "run_cancelled"
      ) {
        controller.abort();
        return true;
      }
    }
  }

  return false;
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

function logRunEvent(event: RunEvent) {
  switch (event.type) {
    case "run_failed":
      console.error(
        `[stage-engine] run failed runId=${event.runId} provider=${event.providerId} ${event.error.message}${event.error.detail ? ` detail=${event.error.detail}` : ""}`,
      );
      return;
    case "run_cancelled":
      console.warn(
        `[stage-engine] run cancelled runId=${event.runId}${event.reason ? ` reason=${event.reason}` : ""}`,
      );
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
