import type { ProviderStatusRecord } from "@stage/data-ops/contracts";
import type { IntegrationRowModel } from "../types/integrations";

export function providerToIntegrationRow(
  provider: ProviderStatusRecord,
): IntegrationRowModel {
  const connected = provider.installed && provider.authenticated && provider.status === "ready";

  return {
    id: provider.id,
    providerId: provider.id,
    name: provider.label,
    description: providerDescription(provider),
    icon: provider.id === "claude" ? "claude" : "code",
    connected,
    detail: providerStatusDetail(provider),
  };
}

function providerDescription(provider: ProviderStatusRecord) {
  if (!provider.installed) return provider.setupHint ?? "Provider CLI is not installed";
  if (!provider.authenticated) return provider.setupHint ?? "Provider is not authenticated";
  return provider.authLabel ?? "Research, strategy, and generation";
}

function providerStatusDetail(provider: ProviderStatusRecord) {
  const parts = [
    provider.version ? `v${provider.version}` : null,
    provider.accountEmail ? `Authenticated as ${provider.accountEmail}` : null,
    provider.status !== "ready" ? provider.status.replaceAll("-", " ") : null,
  ].filter(Boolean);

  return parts.join(" · ");
}
