import { shell, systemPreferences } from "electron";
import type { DesktopPermissionStatus, PermissionKind, PermissionState } from "@shared/models/desktop";

export const defaultPermissionStatus: DesktopPermissionStatus = {
  "screen-recording": "unknown",
  microphone: "unknown",
  accessibility: "unknown",
  notifications: "unknown",
  files: "unknown",
};

function mapMediaAccessStatus(status: string): PermissionState {
  switch (status) {
    case "granted":
      return "granted";
    case "denied":
      return "denied";
    case "not-determined":
      return "not-determined";
    case "restricted":
      return "denied";
    default:
      return "unknown";
  }
}

function getMicrophonePermissionState(): PermissionState {
  if (process.platform !== "darwin") {
    return "unknown";
  }

  return mapMediaAccessStatus(systemPreferences.getMediaAccessStatus("microphone"));
}

function getScreenRecordingPermissionState(): PermissionState {
  if (process.platform !== "darwin") {
    return "unknown";
  }

  return mapMediaAccessStatus(systemPreferences.getMediaAccessStatus("screen"));
}

export function getDesktopPermissionStatus(): DesktopPermissionStatus {
  return {
    ...defaultPermissionStatus,
    microphone: getMicrophonePermissionState(),
    "screen-recording": getScreenRecordingPermissionState(),
  };
}

export async function requestMicrophoneAccess() {
  if (process.platform !== "darwin") {
    return true;
  }

  const current = systemPreferences.getMediaAccessStatus("microphone");
  if (current === "granted") {
    return true;
  }

  if (current === "denied" || current === "restricted") {
    return false;
  }

  return systemPreferences.askForMediaAccess("microphone");
}

export async function openPermissionSystemSettings(permission: PermissionKind) {
  if (process.platform !== "darwin") {
    return;
  }

  const settingsUrl =
    permission === "microphone"
      ? "x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone"
      : permission === "screen-recording"
        ? "x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture"
        : permission === "accessibility"
          ? "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility"
          : "x-apple.systempreferences:com.apple.preference.security?Privacy";

  await shell.openExternal(settingsUrl);
}
