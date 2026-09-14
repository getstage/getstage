import { Suspense, lazy, useEffect, useState } from "react";
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
const OnboardingDemoModal = lazy(() =>
  import("@/components/onboarding/OnboardingDemoModal").then((module) => ({
    default: module.OnboardingDemoModal,
  })),
);

const ONBOARDING_DEMO_SEEN_KEY = "stage:onboarding-demo-seen";

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
  const [paywallRemountKey, setPaywallRemountKey] = useState(0);
  const [demoPending, setDemoPending] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
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
        if (localStorage.getItem(ONBOARDING_DEMO_SEEN_KEY) !== "1") {
          setDemoPending(true);
        }
        void navigate({ to: "/projects" });
        return;
      }
      // Cancelled / non-success: the user is still unpaid. Pin the gate to the
      // paywall and remount the modal so it can never land on an earlier
      // onboarding step (e.g. the "almost setup" preview) that would let a
      // non-subscriber slip into the app.
      gate.notifyCheckoutReturned();
      setPaywallRemountKey((key) => key + 1);
    });

    return unsubscribe;
  }, [desktop, navigate, queryClient, gate.notifyCheckoutReturned]);

  useEffect(() => {
    if (!demoPending || gate.onboardingOpen) return;
    localStorage.setItem(ONBOARDING_DEMO_SEEN_KEY, "1");
    setDemoPending(false);
    setDemoOpen(true);
  }, [demoPending, gate.onboardingOpen]);

  return (
    <>
      {shouldRenderChrome ? (
        <WorkspaceFrame onOpenDemo={() => setDemoOpen(true)}>
          <Outlet />
        </WorkspaceFrame>
      ) : (
        <Outlet />
      )}
      {showOnboarding ? (
        <Suspense fallback={null}>
          <OnboardingModal
            key={paywallRemountKey}
            open={showOnboarding}
            userName={gate.userFirstName}
            initialStep={gate.onboardingInitialStep}
            onComplete={gate.onOnboardingComplete}
          />
        </Suspense>
      ) : null}
      <Suspense fallback={null}>
        <OnboardingDemoModal open={demoOpen} onClose={() => setDemoOpen(false)} />
      </Suspense>
    </>
  );
}
