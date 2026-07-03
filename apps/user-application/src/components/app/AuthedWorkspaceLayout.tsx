import { Suspense, lazy, useEffect } from "react";
import { Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useNonProOnboardingGate } from "@/features/onboarding/useNonProOnboardingGate";
import { useDesktopBridge } from "@/hooks/useDesktopBridge";
import { WorkspaceFrame } from "@/components/app/WorkspaceFrame";
import { convexQueryKeys } from "@/lib/queryKeys";
import { shouldRenderWorkspaceChrome } from "@/lib/app/chromeRules";

const OnboardingModal = lazy(() =>
  import("@/components/onboarding/OnboardingModal").then((module) => ({
    default: module.OnboardingModal,
  })),
);

/**
 * Authenticated shell: renders child routes and global non-Pro onboarding/paywall.
 * Session transport is enforced in `_authed.beforeLoad`; plan/projects gate uses Convex
 * (see `useNonProOnboardingGate`).
 */
export function AuthedWorkspaceLayout() {
  const gate = useNonProOnboardingGate();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const desktop = useDesktopBridge();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const shouldRenderChrome = shouldRenderWorkspaceChrome(pathname);
  // The paywall must never trap the user: keep the plans page and settings
  // (billing + delete account) reachable even while the workspace is gated.
  const paywallAllowsRoute =
    pathname.startsWith("/subscriptions") || pathname.startsWith("/settings");
  const showOnboarding = gate.onboardingOpen && !paywallAllowsRoute;

  useEffect(() => {
    const unsubscribe = desktop.billing.onCheckoutReturn(({ status }) => {
      void queryClient.invalidateQueries({ queryKey: convexQueryKeys.settingsOverview });
      if (status === "success") {
        void navigate({ to: "/projects" });
      }
    });

    return unsubscribe;
  }, [desktop, navigate, queryClient]);

  return (
    <>
      {shouldRenderChrome ? (
        <WorkspaceFrame>
          <Outlet />
        </WorkspaceFrame>
      ) : (
        <Outlet />
      )}
      {showOnboarding ? (
        <Suspense fallback={null}>
          <OnboardingModal
            open={showOnboarding}
            userName={gate.userFirstName}
            initialStep={gate.onboardingInitialStep}
            onComplete={gate.onOnboardingComplete}
          />
        </Suspense>
      ) : null}
    </>
  );
}
