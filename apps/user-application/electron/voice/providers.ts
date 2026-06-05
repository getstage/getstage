import type { ProviderListResponse, ProviderStatusRecord } from "@stage/data-ops/contracts";
import type { VoiceProviderPreferences } from "./providerPreferences";

export type ProviderConnectivity = {
  claude: ProviderStatusRecord | null;
  codex: ProviderStatusRecord | null;
  /** Matches Integrations "Connected": enabled in Stage + CLI ready. */
  claudeActive: boolean;
  codexActive: boolean;
};

export function readProviderConnectivity(
  providers: ProviderListResponse,
  preferences?: VoiceProviderPreferences,
): ProviderConnectivity {
  const claude = providers.providers.find((provider) => provider.id === "claude") ?? null;
  const codex = providers.providers.find((provider) => provider.id === "codex") ?? null;

  return {
    claude,
    codex,
    claudeActive: isProviderActive(claude, preferences?.claude),
    codexActive: isProviderActive(codex, preferences?.codex),
  };
}

function isProviderActive(
  provider: ProviderStatusRecord | null,
  enabledInStage: boolean | undefined,
) {
  if (!provider?.installed || !provider.authenticated || provider.status !== "ready") {
    return false;
  }

  return enabledInStage ?? provider.enabled;
}
