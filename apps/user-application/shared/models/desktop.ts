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

export type DesktopSession = z.infer<typeof desktopSessionSchema>;
export type DesktopStoredSession = z.infer<typeof desktopStoredSessionSchema>;
export type DesktopAuthHandoff = z.infer<typeof desktopAuthHandoffSchema>;
export type DesktopAuthWebHandoff = z.infer<typeof desktopAuthWebHandoffSchema>;
export type DesktopAuthIdentity = z.infer<typeof desktopAuthIdentitySchema>;
export type ActiveAppInfo = z.infer<typeof activeAppInfoSchema>;
export type CaptureResult = z.infer<typeof captureResultSchema>;
export type PermissionKind = z.infer<typeof permissionKindSchema>;
export type PermissionState = z.infer<typeof permissionStateSchema>;
export type DesktopPermissionStatus = z.infer<typeof desktopPermissionStatusSchema>;
export type CompanionState = z.infer<typeof companionStateSchema>;
export type EngineStatusState = z.infer<typeof engineStatusStateSchema>;
export type EngineStatus = z.infer<typeof engineStatusSchema>;
