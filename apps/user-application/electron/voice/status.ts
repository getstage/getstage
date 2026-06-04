import type { ProviderListResponse } from "@stage/data-ops/contracts";
import type { VoiceTranscriptionStatus } from "@shared/models/desktop";
import { probeChatGptCodexVoiceAuth } from "./chatgpt-codex";
import { decideVoiceRoute, voiceRouteUnavailableMessage } from "./route";
import { isOpenRouterConfigured } from "./secrets";
import { readProviderConnectivity } from "./providers";

export async function resolveVoiceTranscriptionStatus(input: {
  cwd: string;
  listProviders: () => Promise<ProviderListResponse>;
}): Promise<VoiceTranscriptionStatus> {
  const providers = await input.listProviders();
  const connectivity = readProviderConnectivity(providers);
  const route = decideVoiceRoute(connectivity);
  const chatgptCodexVoiceReady = connectivity.codexConnected
    ? await probeChatGptCodexVoiceAuth(input.cwd)
    : false;

  const openRouterReady = isOpenRouterConfigured();
  const canTranscribe =
    route?.provider === "openrouter"
      ? openRouterReady
      : route?.provider === "chatgpt-codex-session"
        ? chatgptCodexVoiceReady || (connectivity.claudeConnected && openRouterReady)
        : false;

  return {
    apiVersion: "v1",
    canTranscribe,
    claudeConnected: connectivity.claudeConnected,
    codexConnected: connectivity.codexConnected,
    chatgptCodexVoiceReady,
    openRouterConfigured: isOpenRouterConfigured(),
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
