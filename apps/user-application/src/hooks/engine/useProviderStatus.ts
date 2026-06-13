import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ProviderId } from "@stage/data-ops/contracts";
import { resolveProviderStatusSnapshot } from "@/lib/engine/providerPreflight";
import { engineQueryKeys } from "./queryKeys";
import { useDesktopBridge } from "../useDesktopBridge";

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

  return { ...query, snapshot };
}

export function useProviderUpdate() {
  const desktop = useDesktopBridge();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (providerId: ProviderId) => desktop.engine.updateProvider(providerId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: engineQueryKeys.providers() });
    },
  });
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
