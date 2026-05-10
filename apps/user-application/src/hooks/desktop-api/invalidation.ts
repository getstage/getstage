import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useDesktopBridge } from "../useDesktopBridge";

export function useDesktopApiInvalidation() {
  const desktop = useDesktopBridge();
  const queryClient = useQueryClient();

  useEffect(() => {
    return desktop.auth.onSessionChanged(() => {
      void queryClient.invalidateQueries({ queryKey: ["desktop", "api"] });
    });
  }, [desktop.auth, queryClient]);
}
