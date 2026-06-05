import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { ProviderId } from "@stage/data-ops/contracts";
import {
  PROVIDER_PREFERENCES_STORAGE_KEY,
  readProviderPreferences,
  type ProviderPreferences,
} from "@/lib/engine/providerPreferences";

const CHANGE_EVENT = "stage:provider-preferences-changed";

function writePreferences(preferences: ProviderPreferences) {
  window.localStorage.setItem(PROVIDER_PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribeToPreferences(listener: () => void) {
  function handleStorage(event: StorageEvent) {
    if (event.key === PROVIDER_PREFERENCES_STORAGE_KEY) {
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
  return JSON.stringify(readProviderPreferences());
}

export function useProviderPreferences() {
  const preferencesSnapshot = useSyncExternalStore(
    subscribeToPreferences,
    getPreferencesSnapshot,
    () => "{}",
  );
  const preferences = useMemo(
    () => JSON.parse(preferencesSnapshot) as ProviderPreferences,
    [preferencesSnapshot],
  );

  const setProviderEnabled = useCallback((providerId: ProviderId, enabled: boolean) => {
    const current = readProviderPreferences();
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
