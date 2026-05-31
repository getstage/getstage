import { useCallback, useEffect, useMemo, useState } from "react";
import type { ProviderId } from "@stage/data-ops/contracts";
import { useProviderPreferences } from "@/hooks/engine/useProviderPreferences";
import { useProviderStatus } from "@/hooks/engine/useProviderStatus";

const STORAGE_KEY = "stage.researchProvider.v1";
const RESEARCH_PROVIDERS: ProviderId[] = ["claude", "codex"];

function readStoredProvider(): ProviderId | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === "claude" || raw === "codex") {
      return raw;
    }
  } catch {
    // ignore
  }

  return null;
}

function writeStoredProvider(providerId: ProviderId) {
  window.localStorage.setItem(STORAGE_KEY, providerId);
}

export type ResearchProviderOption = {
  id: ProviderId;
  label: string;
  enabled: boolean;
  ready: boolean;
  selectable: boolean;
  statusMessage?: string;
};

export function useResearchProviderSelection() {
  const providerPreferences = useProviderPreferences();
  const providers = useProviderStatus();
  const [selectedProviderId, setSelectedProviderId] = useState<ProviderId | null>(null);
  const [initialized, setInitialized] = useState(false);

  const providerOptions = useMemo((): ResearchProviderOption[] => {
    return RESEARCH_PROVIDERS.map((id) => {
      const entry = providers.data?.providers.find((provider) => provider.id === id);
      const enabled = providerPreferences.isProviderEnabled(id);
      const ready = entry?.status === "ready";

      return {
        id,
        label: id === "claude" ? "Claude" : "Codex",
        enabled,
        ready,
        selectable: enabled && ready,
        statusMessage: !enabled
          ? "Enable in Settings → Integrations"
          : !ready
            ? (entry?.setupHint ?? "Not ready — refresh Integrations")
            : undefined,
      };
    });
  }, [providerPreferences, providers.data?.providers]);

  useEffect(() => {
    if (initialized) {
      return;
    }

    if (providers.isLoading) {
      return;
    }

    const stored = readStoredProvider();
    const preferred = [stored, ...RESEARCH_PROVIDERS].filter(Boolean) as ProviderId[];

    for (const id of preferred) {
      const option = providerOptions.find((entry) => entry.id === id);
      if (option?.selectable) {
        setSelectedProviderId(id);
        setInitialized(true);
        return;
      }
    }

    setInitialized(true);
  }, [initialized, providerOptions, providers.isLoading]);

  const selectProvider = useCallback((providerId: ProviderId) => {
    setSelectedProviderId(providerId);
    writeStoredProvider(providerId);
  }, []);

  const selectedOption = providerOptions.find((option) => option.id === selectedProviderId);
  const canRunWithProvider = selectedOption?.selectable === true;

  return {
    selectedProviderId,
    selectProvider,
    providerOptions,
    canRunWithProvider,
  };
}
