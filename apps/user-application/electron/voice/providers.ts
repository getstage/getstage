import type { ProviderListResponse, ProviderStatusRecord } from "@stage/data-ops/contracts";

export type ProviderConnectivity = {
  claude: ProviderStatusRecord | null;
  codex: ProviderStatusRecord | null;
  claudeConnected: boolean;
  codexConnected: boolean;
  bothConnected: boolean;
};

export function readProviderConnectivity(providers: ProviderListResponse): ProviderConnectivity {
  const claude = providers.providers.find((provider) => provider.id === "claude") ?? null;
  const codex = providers.providers.find((provider) => provider.id === "codex") ?? null;

  const claudeConnected = isProviderConnected(claude);
  const codexConnected = isProviderConnected(codex);

  return {
    claude,
    codex,
    claudeConnected,
    codexConnected,
    bothConnected: claudeConnected && codexConnected,
  };
}

function isProviderConnected(provider: ProviderStatusRecord | null) {
  return Boolean(provider?.installed && provider.authenticated);
}
