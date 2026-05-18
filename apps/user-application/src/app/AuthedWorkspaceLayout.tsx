import { Outlet, useRouterState } from "@tanstack/react-router";
import { OnboardingModal } from "@/components/onboarding/OnboardingModal";
import { useNonProOnboardingGate } from "@/features/onboarding/useNonProOnboardingGate";
import { WorkspaceFrame } from "@/app/WorkspaceFrame";

/**
 * Authenticated shell: renders child routes and global non-Pro onboarding/paywall.
 * Session transport is enforced in `_authed.beforeLoad`; plan/projects gate uses Convex
 * (see `useNonProOnboardingGate`).
 */
export function AuthedWorkspaceLayout() {
  const gate = useNonProOnboardingGate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const shouldRenderChrome = pathname !== "/projects/create" && pathname !== "/subscriptions";

  return (
    <>
      {shouldRenderChrome ? (
        <WorkspaceFrame>
          <Outlet />
        </WorkspaceFrame>
      ) : (
        <Outlet />
      )}
      <OnboardingModal
        open={gate.onboardingOpen}
        userName={gate.userFirstName}
        initialStep={gate.onboardingInitialStep}
        onComplete={gate.onOnboardingComplete}
      />
    </>
  );
}
