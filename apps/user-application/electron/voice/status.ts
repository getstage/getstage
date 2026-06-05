import type { ProviderListResponse } from "@stage/data-ops/contracts";
import type { VoiceTranscriptionStatus } from "@shared/models/desktop";
import { probeChatGptCodexVoiceAuth } from "./chatgpt-codex";
import { parseVoiceProviderPreferences, type VoiceProviderPreferences } from "./providerPreferences";
import { decideVoiceRoute, voiceRouteUnavailableMessage } from "./route";
import { isOpenRouterConfigured } from "./secrets";
import { readProviderConnectivity } from "./providers";

export async function resolveVoiceTranscriptionStatus(input: {
  cwd: string;
  listProviders: () => Promise<ProviderListResponse>;
  providerPreferences?: VoiceProviderPreferences;
}): Promise<VoiceTranscriptionStatus> {
  const providers = await input.listProviders();
  const connectivity = readProviderConnectivity(providers, input.providerPreferences);
  const route = decideVoiceRoute(connectivity);
  const chatgptCodexVoiceReady = connectivity.codexActive
    ? await probeChatGptCodexVoiceAuth(input.cwd)
    : false;

  const openRouterReady = isOpenRouterConfigured();
  const canTranscribe =
    route?.provider === "openrouter"
      ? openRouterReady
      : route?.provider === "chatgpt-codex-session"
        ? chatgptCodexVoiceReady || (connectivity.claudeActive && openRouterReady)
        : false;

  return {
    apiVersion: "v1",
    canTranscribe,
    claudeConnected: connectivity.claudeActive,
    codexConnected: connectivity.codexActive,
    chatgptCodexVoiceReady,
    openRouterConfigured: openRouterReady,
    preferredProvider:
      route?.provider === "openrouter"
        ? "openrouter"
        : route?.provider === "chatgpt-codex-session"
          ? "chatgpt-codex-session"
          : "none",
    preferredModel: route?.model ?? null,
    setupHint: canTranscribe ? null : voiceRouteUnavailableMessage(connectivity),
  };
}

export { parseVoiceProviderPreferences };
