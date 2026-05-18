import {
  Outlet,
  createRootRoute,
  type ErrorComponentProps,
  useRouter,
  useRouterState,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { DesktopShell } from "@/app/DesktopShell";
import { useDesktopBridge } from "@/hooks/useDesktopBridge";
import { buildAuthRedirect } from "@/lib/authRedirect";
import { desktopSessionQueryKey } from "@/lib/desktopSession";
import { toUserFacingErrorMessage } from "@/lib/errors";

export const Route = createRootRoute({
  component: RootLayout,
  errorComponent: RootErrorBoundary,
});

function RootLayout() {
  const desktop = useDesktopBridge();
  const queryClient = useQueryClient();
  const router = useRouter();
  const location = useRouterState({ select: (state) => state.location });

  useEffect(() => {
    return desktop.auth.onSessionChanged((nextSession) => {
      void queryClient.invalidateQueries({ queryKey: [...desktopSessionQueryKey] });

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

  return (
    <DesktopShell hideCompanion={location.pathname === "/subscriptions"}>
      <Outlet />
    </DesktopShell>
  );
}

function RootErrorBoundary({ error, reset }: ErrorComponentProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5f5f5] px-6">
      <div className="w-full max-w-[480px] rounded-[24px] border border-[#e5e5e5] bg-white p-8 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
        <h1 className="text-[28px] font-semibold text-[#0a0a0a]">Something went wrong</h1>
        <p className="mt-3 text-[15px] leading-[1.6] text-[#525252]">
          {toUserFacingErrorMessage(
            error,
            "We could not load this page right now. Please try again in a moment.",
          )}
        </p>
        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            className="rounded-[10px] bg-[#0a0a0a] px-4 py-2 text-[14px] font-medium text-white transition-colors hover:bg-[#262626]"
            onClick={() => reset()}
          >
            Try again
          </button>
          <button
            type="button"
            className="rounded-[10px] border border-[#e5e5e5] px-4 py-2 text-[14px] font-medium text-[#0a0a0a] transition-colors hover:bg-[#f5f5f5]"
            onClick={() => window.location.assign("/")}
          >
            Go to dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
