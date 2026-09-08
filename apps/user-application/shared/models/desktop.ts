import { z } from "zod";

export const desktopSessionSchema = z.object({
  avatarUrl: z.string().optional(),
  email: z.string().optional(),
  hasAccessToken: z.boolean(),
  name: z.string().optional(),
  userId: z.string(),
  expiresAt: z.number().optional(),
});

export const desktopStoredSessionSchema = z.object({
  accessToken: z.string().min(1),
  avatarUrl: z.string().optional(),
  email: z.string().optional(),
  expiresAt: z.number().optional(),
  name: z.string().optional(),
  userId: z.string(),
});

export const desktopAuthHandoffSchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
});

export const desktopAuthWebHandoffSchema = z.object({
  redirectUri: z.instanceof(URL),
  state: z.string().min(1),
  token: z.string().min(1),
});

export const desktopAuthIdentitySchema = z.object({
  user: z.object({
    avatarUrl: z.string().optional(),
    email: z.string().optional(),
    id: z.string().min(1),
    name: z.string().optional(),
  }),
});

export const activeAppInfoSchema = z.object({
  name: z.string(),
  bundleId: z.string().optional(),
  path: z.string().optional(),
  windowTitle: z.string().optional(),
});

export const captureResultSchema = z.object({
  imageDataUrl: z.string(),
  width: z.number(),
  height: z.number(),
  source: z.enum(["screen", "window", "region"]),
});

export const chatImageAttachmentSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(240),
  mimeType: z.enum(["image/png", "image/jpeg", "image/webp"]),
  localPath: z.string().min(1),
  previewDataUrl: z.string().startsWith("data:image/"),
});

export const captureWindowSourceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(240),
  kind: z.enum(["window", "screen"]).default("window"),
  previewDataUrl: z.string().startsWith("data:image/"),
});

export const chatAttachmentTargetSchema = z.object({
  chatId: z.string().regex(/^chat-[a-zA-Z0-9-]+$/),
});

export const captureWindowRequestSchema = chatAttachmentTargetSchema.extend({
  sourceId: z.string().min(1),
});

export const importChatImageBytesRequestSchema = chatAttachmentTargetSchema.extend({
  name: z.string().min(1).max(240),
  mimeType: z.enum(["image/png", "image/jpeg", "image/webp"]),
  bytes: z.instanceof(Uint8Array).refine((bytes) => bytes.byteLength <= 10 * 1024 * 1024),
});

export const permissionKindSchema = z.enum([
  "screen-recording",
  "microphone",
  "accessibility",
  "notifications",
  "files",
]);

export const permissionStateSchema = z.enum([
  "granted",
  "denied",
  "not-determined",
  "unknown",
]);

export const desktopPermissionStatusSchema = z.record(
  permissionKindSchema,
  permissionStateSchema,
);

export const companionStateSchema = z.enum([
  "idle",
  "listening",
  "processing",
  "thinking",
  "response",
  "error",
]);

export const companionWidgetSettingsSchema = z.object({
  allowEverywhere: z.boolean(),
});

export const DEFAULT_COMPANION_WIDGET_SETTINGS = {
  allowEverywhere: true,
} satisfies z.infer<typeof companionWidgetSettingsSchema>;

export const engineStatusStateSchema = z.enum([
  "idle",
  "starting",
  "ready",
  "failed",
  "stopping",
  "stopped",
]);

export const engineStatusSchema = z.object({
  adopted: z.boolean(),
  error: z.string().optional(),
  pid: z.number().nullable(),
  port: z.number().int().positive(),
  state: engineStatusStateSchema,
});

export const voiceTranscriptionStatusSchema = z.object({
  apiVersion: z.literal("v1"),
  canTranscribe: z.boolean(),
  claudeConnected: z.boolean(),
  codexConnected: z.boolean(),
  chatgptCodexVoiceReady: z.boolean(),
  openRouterConfigured: z.boolean(),
  preferredProvider: z.enum(["chatgpt-codex-session", "openrouter", "none"]),
  preferredModel: z.string().min(1).nullable(),
  setupHint: z.string().min(1).nullable(),
});

export const desktopShortcutSettingsSchema = z.object({
  voiceNoteShortcut: z.string().min(1).max(80),
  aiChatShortcut: z.string().min(1).max(80),
});

export const DEFAULT_DESKTOP_SHORTCUT_SETTINGS = {
  voiceNoteShortcut: "CommandOrControl+Shift+V",
  aiChatShortcut: "CommandOrControl+Shift+A",
} satisfies z.infer<typeof desktopShortcutSettingsSchema>;

export const desktopShortcutRegistrationSchema = z.object({
  accelerator: z.string(),
  registered: z.boolean(),
  reason: z.string().optional(),
});

export const desktopShortcutSettingsResultSchema = z.object({
  settings: desktopShortcutSettingsSchema,
  registrations: z.object({
    voiceNote: desktopShortcutRegistrationSchema,
    aiChat: desktopShortcutRegistrationSchema,
  }),
});

export const desktopIntegrationOAuthResultSchema = z.object({
  ok: z.literal(true),
  provider: z.enum(["figma", "notion"]),
  status: z.enum(["connected", "error"]),
  reason: z.string().optional(),
});

export const desktopUpdateStatusSchema = z.object({
  currentVersion: z.string(),
  availableVersion: z.string().optional(),
  isChecking: z.boolean(),
  /** True once the available update has finished downloading in the background. */
  downloaded: z.boolean().optional(),
});

export const projectExportProviderSchema = z.enum([
  "claude",
  "codex",
  "cursor",
  "vscode",
  "zed",
  "antigravity",
  "windsurf",
]);

export const projectExportAppsResponseSchema = z.object({
  apps: z.array(
    z.object({
      id: projectExportProviderSchema,
      available: z.boolean(),
    }),
  ),
});

export const projectExportFileSchema = z.object({
  relativePath: z.string().min(1).max(240),
  content: z.string().max(20_000_000),
});

export const projectExportAssetSchema = z.object({
  relativePath: z.string().min(1).max(240),
  url: z.string().url().max(4_000),
});

export const projectExportRequestSchema = z.object({
  projectName: z.string().min(1).max(160),
  files: z.array(projectExportFileSchema).min(1).max(20),
  assets: z.array(projectExportAssetSchema).max(200).default([]),
  provider: projectExportProviderSchema.optional(),
});

export const projectExportResponseSchema = z.object({
  cancelled: z.boolean(),
  directoryPath: z.string().optional(),
  fileCount: z.number().int().nonnegative(),
  assetCount: z.number().int().nonnegative(),
  failedAssets: z.array(z.string()),
  launchedProvider: projectExportProviderSchema.optional(),
  launchError: z.string().optional(),
});

export type DesktopUpdateStatus = z.infer<typeof desktopUpdateStatusSchema>;
export type ProjectExportProvider = z.infer<typeof projectExportProviderSchema>;
export type ProjectExportAppsResponse = z.infer<typeof projectExportAppsResponseSchema>;
export type ProjectExportFile = z.infer<typeof projectExportFileSchema>;
export type ProjectExportAsset = z.infer<typeof projectExportAssetSchema>;
export type ProjectExportRequest = z.infer<typeof projectExportRequestSchema>;
export type ProjectExportResponse = z.infer<typeof projectExportResponseSchema>;

export type IntegrationOAuthResult =
  | z.infer<typeof desktopIntegrationOAuthResultSchema>
  | { error: string; ok: false };

export type DesktopSession = z.infer<typeof desktopSessionSchema>;
export type DesktopStoredSession = z.infer<typeof desktopStoredSessionSchema>;
export type DesktopAuthHandoff = z.infer<typeof desktopAuthHandoffSchema>;
export type DesktopAuthWebHandoff = z.infer<typeof desktopAuthWebHandoffSchema>;
export type DesktopAuthIdentity = z.infer<typeof desktopAuthIdentitySchema>;
export type ActiveAppInfo = z.infer<typeof activeAppInfoSchema>;
export type CaptureResult = z.infer<typeof captureResultSchema>;
export type ChatImageAttachment = z.infer<typeof chatImageAttachmentSchema>;
export type CaptureWindowSource = z.infer<typeof captureWindowSourceSchema>;
export type ChatAttachmentTarget = z.infer<typeof chatAttachmentTargetSchema>;
export type CaptureWindowRequest = z.infer<typeof captureWindowRequestSchema>;
export type ImportChatImageBytesRequest = z.infer<typeof importChatImageBytesRequestSchema>;
export type PermissionKind = z.infer<typeof permissionKindSchema>;
export type PermissionState = z.infer<typeof permissionStateSchema>;
export type DesktopPermissionStatus = z.infer<typeof desktopPermissionStatusSchema>;
export type CompanionState = z.infer<typeof companionStateSchema>;
export type CompanionWidgetSettings = z.infer<typeof companionWidgetSettingsSchema>;
export type EngineStatusState = z.infer<typeof engineStatusStateSchema>;
export type EngineStatus = z.infer<typeof engineStatusSchema>;
export type VoiceTranscriptionStatus = z.infer<typeof voiceTranscriptionStatusSchema>;
export type DesktopShortcutSettings = z.infer<typeof desktopShortcutSettingsSchema>;
export type DesktopShortcutSettingsResult = z.infer<typeof desktopShortcutSettingsResultSchema>;
