import { ipcMain } from "electron";
import type { ProviderListResponse } from "@stage/data-ops/contracts";
import { IPC_CHANNELS } from "@shared/ipc/channels";
import { logDesktopInfo } from "../helpers/desktop-log";
import {
  desktopShortcutSettingsResultSchema,
  voiceTranscriptionStatusSchema,
} from "@shared/models/desktop";
import { toUserFacingVoiceError } from "./errors";
import { parseVoiceProviderPreferences, resolveVoiceTranscriptionStatus } from "./status";
import { transcribeVoiceWithRouting } from "./route";
import { getShortcutSettingsResult, updateShortcutSettings } from "./shortcuts";

export type VoiceHandlerDependencies = {
  listProviders: () => Promise<ProviderListResponse>;
};

export function registerVoiceHandlers(deps: VoiceHandlerDependencies) {
  ipcMain.removeHandler(IPC_CHANNELS.voiceGetStatus);
  ipcMain.handle(IPC_CHANNELS.voiceGetStatus, async (_event, rawPreferences: unknown) => {
    logDesktopInfo("stage-voice", "status requested");
    const status = await resolveVoiceTranscriptionStatus({
      cwd: process.cwd(),
      listProviders: deps.listProviders,
      providerPreferences: parseVoiceProviderPreferences(rawPreferences),
    });

    const parsed = voiceTranscriptionStatusSchema.parse(status);
    logDesktopInfo(
      "stage-voice",
      `status resolved canTranscribe=${parsed.canTranscribe} provider=${parsed.preferredProvider}`,
    );
    return parsed;
  });

  ipcMain.removeHandler(IPC_CHANNELS.voiceTranscribe);
  ipcMain.handle(IPC_CHANNELS.voiceTranscribe, async (_event, rawInput: unknown) => {
    logDesktopInfo("stage-voice", "transcribe requested");
    try {
      const result = await transcribeVoiceWithRouting({
        rawInput,
        listProviders: deps.listProviders,
      });
      logDesktopInfo(
        "stage-voice",
        `transcribe completed provider=${result.provider} chars=${result.text.length}`,
      );
      return result;
    } catch (error: unknown) {
      const message = toUserFacingVoiceError(error);
      console.error("[stage-voice] transcription failed", error);
      throw new Error(message);
    }
  });

  ipcMain.removeHandler(IPC_CHANNELS.voiceGetSettings);
  ipcMain.handle(IPC_CHANNELS.voiceGetSettings, async () =>
    desktopShortcutSettingsResultSchema.parse(getShortcutSettingsResult()),
  );

  ipcMain.removeHandler(IPC_CHANNELS.voiceUpdateSettings);
  ipcMain.handle(IPC_CHANNELS.voiceUpdateSettings, async (_event, rawSettings: unknown) =>
    desktopShortcutSettingsResultSchema.parse(updateShortcutSettings(rawSettings)),
  );
}
