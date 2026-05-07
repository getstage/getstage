import type { DesktopPermissionStatus } from "@shared/models/desktop";

export const defaultPermissionStatus: DesktopPermissionStatus = {
  "screen-recording": "unknown",
  microphone: "unknown",
  accessibility: "unknown",
  notifications: "unknown",
  files: "unknown",
};
