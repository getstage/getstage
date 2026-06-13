import type { ProviderId, ProviderStatusRecord } from "@stage/data-ops/contracts";

function providerLabel(providerId: ProviderId) {
  return providerId === "claude" ? "Claude" : "Codex";
}

export function getProviderPreflightError(args: {
  providerId: ProviderId;
  providers: ProviderStatusRecord[] | undefined;
  isEnabled: boolean;
  context?: "chat" | "run";
}): string | null {
  const label = providerLabel(args.providerId);
  const settingsHint =
    args.context === "chat"
      ? `Connect ${label} in Settings → Integrations before using it in Stage chat.`
      : `Connect ${label} in Settings → Integrations before running.`;

  if (!args.isEnabled) {
    return settingsHint;
  }

  const provider = args.providers?.find((entry) => entry.id === args.providerId);
  if (!provider || provider.status !== "ready") {
    return (
      provider?.setupHint ??
      `${label} is not set up yet. Open Settings → Integrations and try again.`
    );
  }

  return null;
}
