import { ipcMain } from "electron";
import type { ProviderListResponse } from "@stage/data-ops/contracts";
import { IPC_CHANNELS } from "@shared/ipc/channels";
import { voiceTranscriptionStatusSchema } from "@shared/models/desktop";
import { toUserFacingVoiceError } from "./errors";
import { parseVoiceProviderPreferences, resolveVoiceTranscriptionStatus } from "./status";
import { transcribeVoiceWithRouting } from "./route";

export type VoiceHandlerDependencies = {
  listProviders: () => Promise<ProviderListResponse>;
};

export function registerVoiceHandlers(deps: VoiceHandlerDependencies) {
  ipcMain.removeHandler(IPC_CHANNELS.voiceGetStatus);
  ipcMain.handle(IPC_CHANNELS.voiceGetStatus, async (_event, rawPreferences: unknown) => {
    const status = await resolveVoiceTranscriptionStatus({
      cwd: process.cwd(),
      listProviders: deps.listProviders,
      providerPreferences: parseVoiceProviderPreferences(rawPreferences),
    });

    return voiceTranscriptionStatusSchema.parse(status);
  });

  ipcMain.removeHandler(IPC_CHANNELS.voiceTranscribe);
  ipcMain.handle(IPC_CHANNELS.voiceTranscribe, async (_event, rawInput: unknown) => {
    try {
      return await transcribeVoiceWithRouting({
        rawInput,
        listProviders: deps.listProviders,
      });
    } catch (error: unknown) {
      const message = toUserFacingVoiceError(error);
      console.error("[stage-voice]", message);
      throw new Error(message);
    }
  });
}
