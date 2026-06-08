import { app, globalShortcut } from "electron";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  desktopShortcutSettingsResultSchema,
  desktopShortcutSettingsSchema,
  type DesktopShortcutSettings,
  type DesktopShortcutSettingsResult,
} from "@shared/models/desktop";

export const DEFAULT_SHORTCUT_SETTINGS: DesktopShortcutSettings = {
  voiceNoteShortcut: "CommandOrControl+Shift+V",
  aiChatShortcut: "CommandOrControl+Shift+A",
};

type ShortcutActions = {
  openLatestChat: () => void;
  startStopRecording: () => void;
};

let shortcutActions: ShortcutActions | null = null;
let lastRegistrationResult: DesktopShortcutSettingsResult | null = null;
let registeredAccelerators: string[] = [];

function settingsPath() {
  return join(app.getPath("userData"), "stage-voice-shortcuts.json");
}

function normalizeShortcutSettings(raw: unknown): DesktopShortcutSettings {
  const parsed = desktopShortcutSettingsSchema.safeParse(raw);
  if (!parsed.success) {
    return DEFAULT_SHORTCUT_SETTINGS;
  }

  return parsed.data;
}

export function readShortcutSettings(): DesktopShortcutSettings {
  try {
    const raw = JSON.parse(readFileSync(settingsPath(), "utf8")) as unknown;
    return normalizeShortcutSettings(raw);
  } catch {
    return DEFAULT_SHORTCUT_SETTINGS;
  }
}

function writeShortcutSettings(settings: DesktopShortcutSettings) {
  const path = settingsPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(settings, null, 2));
}

const SHORTCUT_DEBOUNCE_MS = 400;

function registerShortcut(
  accelerator: string,
  action: () => void,
): DesktopShortcutSettingsResult["registrations"]["voiceNote"] {
  if (!accelerator.trim()) {
    return {
      accelerator,
      registered: false,
      reason: "Shortcut is empty.",
    };
  }

  let lastInvokedAt = 0;
  const debouncedAction = () => {
    const now = Date.now();
    if (now - lastInvokedAt < SHORTCUT_DEBOUNCE_MS) {
      return;
    }

    lastInvokedAt = now;
    action();
  };

  try {
    const registered = globalShortcut.register(accelerator, debouncedAction);
    if (registered) {
      registeredAccelerators.push(accelerator);
      return { accelerator, registered: true };
    }
  } catch {
    return {
      accelerator,
      registered: false,
      reason: "Electron rejected this shortcut.",
    };
  }

  return {
    accelerator,
    registered: false,
    reason: "This shortcut is already used by another app or by the system.",
  };
}

export function registerVoiceShortcuts(actions: ShortcutActions): DesktopShortcutSettingsResult {
  shortcutActions = actions;
  globalShortcut.unregisterAll();
  registeredAccelerators = [];

  const settings = readShortcutSettings();
  const result = desktopShortcutSettingsResultSchema.parse({
    settings,
    registrations: {
      voiceNote: registerShortcut(settings.voiceNoteShortcut, actions.startStopRecording),
      aiChat: registerShortcut(settings.aiChatShortcut, actions.openLatestChat),
    },
  });

  lastRegistrationResult = result;
  return result;
}

export function getShortcutSettingsResult(): DesktopShortcutSettingsResult {
  return lastRegistrationResult ?? registerVoiceShortcuts(
    shortcutActions ?? {
      openLatestChat: () => {},
      startStopRecording: () => {},
    },
  );
}

export function updateShortcutSettings(rawSettings: unknown): DesktopShortcutSettingsResult {
  if (!shortcutActions) {
    throw new Error("Shortcut actions are not ready yet.");
  }

  const settings = desktopShortcutSettingsSchema.parse(rawSettings);
  writeShortcutSettings(settings);
  return registerVoiceShortcuts(shortcutActions);
}
