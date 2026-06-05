import { useQuery } from "@tanstack/react-query";
import { useDesktopBridge } from "./useDesktopBridge";

type UseEngineStatusOptions = {
  enabled?: boolean;
};

export function useEngineStatus(options: UseEngineStatusOptions = {}) {
  const desktop = useDesktopBridge();

  return useQuery({
    queryKey: ["desktop", "engine-status"],
    queryFn: () => desktop.engine.getStatus(),
    enabled: options.enabled ?? false,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}
