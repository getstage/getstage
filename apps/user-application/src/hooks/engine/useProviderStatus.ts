import { useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ProviderId,
  ProviderListResponse,
  ProviderStatusRecord,
} from "@stage/data-ops/contracts";
import { resolveProviderStatusSnapshot } from "@/lib/engine/providerPreflight";
import { engineQueryKeys } from "./queryKeys";
import { useDesktopBridge } from "../useDesktopBridge";

const ENGINE_UNAVAILABLE_MESSAGE = "Stage Engine is unavailable. Refresh to check this provider.";

const FALLBACK_PROVIDER_LIST: ProviderListResponse = {
  apiVersion: "v1",
  providers: [
    unavailableProvider("claude", "Claude"),
    unavailableProvider("codex", "Codex"),
  ],
};

function unavailableProvider(id: ProviderId, label: string): ProviderStatusRecord {
  return {
    id,
    label,
    kind: "cli",
    installed: true,
    authenticated: false,
    authStatus: "unknown",
    enabled: true,
    version: null,
    status: "error",
    updateAvailable: null,
    updateStatus: "idle",
    checkedAt: 0,
    models: [],
    setupHint: ENGINE_UNAVAILABLE_MESSAGE,
    message: ENGINE_UNAVAILABLE_MESSAGE,
    error: {
      code: "io_error",
      message: ENGINE_UNAVAILABLE_MESSAGE,
      providerId: id,
      retryable: true,
    },
  };
}

export function useProviderStatus() {
  const desktop = useDesktopBridge();

  const query = useQuery({
    queryKey: engineQueryKeys.providers(),
    queryFn: () => desktop.engine.listProviders(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const snapshot = useMemo(
    () =>
      resolveProviderStatusSnapshot({
        data: query.data,
        isError: query.isError,
      }),
    [query.data, query.isError],
  );

  const providerList = query.data ?? FALLBACK_PROVIDER_LIST;

  return { ...query, providerList, snapshot };
}

export function useProviderUpdate() {
  const desktop = useDesktopBridge();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (providerId: ProviderId) => {
      const response = await desktop.engine.updateProvider(providerId);
      if (response.status === "failed") {
        throw new Error(
          response.error?.message ??
            response.message ??
            `Could not update ${providerId}.`,
        );
      }
      return response;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: engineQueryKeys.providers() });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: engineQueryKeys.providers() });
    },
  });
}

export function useProviderUpdates() {
  const { providerList } = useProviderStatus();
  const providerUpdate = useProviderUpdate();

  const providersWithUpdates = useMemo(
    () => providerList.providers.filter((provider) => provider.updateAvailable === true),
    [providerList.providers],
  );

  const updateAll = useCallback(async () => {
    for (const provider of providersWithUpdates) {
      await providerUpdate.mutateAsync(provider.id);
    }
  }, [providersWithUpdates, providerUpdate]);

  return {
    providersWithUpdates,
    isUpdating: providerUpdate.isPending,
    updateAll,
  };
}

export function useProviderRefresh() {
  const desktop = useDesktopBridge();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => desktop.engine.refreshProviders(),
    onSuccess: (response) => {
      queryClient.setQueryData(engineQueryKeys.providers(), response);
    },
  });
}
