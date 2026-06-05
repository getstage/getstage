import type { ProviderId } from "@stage/data-ops/contracts";

export const PROVIDER_PREFERENCES_STORAGE_KEY = "stage.localProviderPreferences.v1";

export type ProviderPreferences = Partial<Record<ProviderId, boolean>>;

export function readProviderPreferences(): ProviderPreferences {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(PROVIDER_PREFERENCES_STORAGE_KEY);
    if (!raw) return {};

    const parsed = JSON.parse(raw) as ProviderPreferences;
    return {
      claude: Boolean(parsed.claude),
      codex: Boolean(parsed.codex),
    };
  } catch {
    return {};
  }
}

export function isProviderEnabledInPreferences(
  preferences: ProviderPreferences,
  providerId: ProviderId,
) {
  return Boolean(preferences[providerId]);
}
