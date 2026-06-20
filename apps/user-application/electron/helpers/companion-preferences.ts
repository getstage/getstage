import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { app } from "electron";
import {
  DEFAULT_COMPANION_WIDGET_SETTINGS,
  companionWidgetSettingsSchema,
  type CompanionWidgetSettings,
} from "@shared/models/desktop";

const COMPANION_PREFERENCES_FILE = "companion-preferences.json";

let currentSettings: CompanionWidgetSettings = DEFAULT_COMPANION_WIDGET_SETTINGS;
let writeQueue = Promise.resolve();

function getPreferencesPath() {
  return join(app.getPath("userData"), COMPANION_PREFERENCES_FILE);
}

async function writeSettings(settings: CompanionWidgetSettings) {
  const filePath = getPreferencesPath();
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
}

export async function loadCompanionWidgetSettings() {
  try {
    const raw = await readFile(getPreferencesPath(), "utf8");
    currentSettings = companionWidgetSettingsSchema.parse(JSON.parse(raw));
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      currentSettings = DEFAULT_COMPANION_WIDGET_SETTINGS;
      return currentSettings;
    }

    const message = error instanceof Error ? error.message : "Unknown companion settings error.";
    console.warn(`[stage-companion] Could not load companion preferences: ${message}`);
    currentSettings = DEFAULT_COMPANION_WIDGET_SETTINGS;
  }

  return currentSettings;
}

export function getCompanionWidgetSettings() {
  return currentSettings;
}

export async function saveCompanionWidgetSettings(settings: CompanionWidgetSettings) {
  currentSettings = companionWidgetSettingsSchema.parse(settings);
  writeQueue = writeQueue.then(() => writeSettings(currentSettings), () =>
    writeSettings(currentSettings),
  );
  await writeQueue;
  return currentSettings;
}
