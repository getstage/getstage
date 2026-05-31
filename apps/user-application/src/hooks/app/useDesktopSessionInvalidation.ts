import { useEffect } from "react";
import { useRouter, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useDesktopBridge } from "@/hooks/useDesktopBridge";
import { buildAuthRedirect } from "@/lib/authRedirect";
import {
  clearDesktopSessionCache,
  desktopSessionQueryKey,
} from "@/lib/auth/session";

/**
 * Single app-level subscription for desktop session changes.
 * Clears the session cache and invalidates related TanStack Query keys.
 */
export function useDesktopSessionInvalidation() {
  const desktop = useDesktopBridge();
  const queryClient = useQueryClient();
  const router = useRouter();
  const location = useRouterState({ select: (state) => state.location });

  useEffect(() => {
    return desktop.auth.onSessionChanged((nextSession) => {
      clearDesktopSessionCache();
      void queryClient.invalidateQueries({ queryKey: [...desktopSessionQueryKey] });
      void queryClient.invalidateQueries({ queryKey: ["desktop", "project-context", "selected"] });

      if (nextSession?.hasAccessToken || location.pathname === "/auth") {
        return;
      }

      const redirectTarget = buildAuthRedirect(
        location.pathname,
        location.searchStr,
        location.hash,
      );

      void router.navigate(
        redirectTarget
          ? {
              to: "/auth",
              search: { redirect: redirectTarget },
              replace: true,
            }
          : {
              to: "/auth",
              replace: true,
            },
      );
    });
  }, [
    desktop.auth,
    location.hash,
    location.pathname,
    location.searchStr,
    queryClient,
    router,
  ]);
}
