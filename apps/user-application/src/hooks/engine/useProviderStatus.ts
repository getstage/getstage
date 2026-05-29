import { useQuery } from "@tanstack/react-query";
import { useDesktopBridge } from "../useDesktopBridge";

export function useProviderStatus() {
  const desktop = useDesktopBridge();

  return useQuery({
    queryKey: ["desktop", "engine-providers"],
    queryFn: () => desktop.engine.listProviders(),
    refetchInterval: 10_000,
  });
}
