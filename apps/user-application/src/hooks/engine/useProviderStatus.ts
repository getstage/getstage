import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ProviderId } from "@stage/data-ops/contracts";
import { engineQueryKeys } from "./queryKeys";
import { useDesktopBridge } from "../useDesktopBridge";

export function useProviderStatus() {
  const desktop = useDesktopBridge();

  return useQuery({
    queryKey: engineQueryKeys.providers(),
    queryFn: () => desktop.engine.listProviders(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
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
