import { z } from "zod";

export const desktopSessionSchema = z.object({
  userId: z.string(),
  accessToken: z.string().optional(),
  expiresAt: z.number().optional(),
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

export type DesktopSession = z.infer<typeof desktopSessionSchema>;
export type ActiveAppInfo = z.infer<typeof activeAppInfoSchema>;
export type CaptureResult = z.infer<typeof captureResultSchema>;
export type PermissionKind = z.infer<typeof permissionKindSchema>;
export type PermissionState = z.infer<typeof permissionStateSchema>;
export type DesktopPermissionStatus = z.infer<typeof desktopPermissionStatusSchema>;
export type CompanionState = z.infer<typeof companionStateSchema>;
