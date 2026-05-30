import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { ProviderId } from "@stage/data-ops/contracts";

const STORAGE_KEY = "stage.localProviderPreferences.v1";
const CHANGE_EVENT = "stage:provider-preferences-changed";

type ProviderPreferenceState = Partial<Record<ProviderId, boolean>>;

function readPreferences(): ProviderPreferenceState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as ProviderPreferenceState;

    return {
      claude: Boolean(parsed.claude),
      codex: Boolean(parsed.codex),
    };
  } catch {
    return {};
  }
}

function writePreferences(preferences: ProviderPreferenceState) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribeToPreferences(listener: () => void) {
  function handleStorage(event: StorageEvent) {
    if (event.key === STORAGE_KEY) {
      listener();
    }
  }

  window.addEventListener(CHANGE_EVENT, listener);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(CHANGE_EVENT, listener);
    window.removeEventListener("storage", handleStorage);
  };
}

function getPreferencesSnapshot() {
  return JSON.stringify(readPreferences());
}

export function useProviderPreferences() {
  const preferencesSnapshot = useSyncExternalStore(
    subscribeToPreferences,
    getPreferencesSnapshot,
    () => "{}",
  );
  const preferences = useMemo(
    () => JSON.parse(preferencesSnapshot) as ProviderPreferenceState,
    [preferencesSnapshot],
  );

  const setProviderEnabled = useCallback((providerId: ProviderId, enabled: boolean) => {
    const current = readPreferences();
    writePreferences({
      ...current,
      [providerId]: enabled,
    });
  }, []);

  return useMemo(
    () => ({
      preferences,
      isProviderEnabled: (providerId: ProviderId) => Boolean(preferences[providerId]),
      setProviderEnabled,
    }),
    [preferences, setProviderEnabled],
  );
}
