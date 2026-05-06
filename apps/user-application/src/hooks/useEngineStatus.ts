import { useQuery } from "@tanstack/react-query";
import { useDesktopBridge } from "./useDesktopBridge";

export function useEngineStatus() {
  const desktop = useDesktopBridge();

  return useQuery({
    queryKey: ["desktop", "engine-status"],
    queryFn: () => desktop.engine.getStatus(),
    refetchInterval: 2_000,
  });
}
