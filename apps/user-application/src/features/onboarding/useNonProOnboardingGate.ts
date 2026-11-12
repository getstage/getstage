import { useCallback, useEffect, useState } from "react";
import type { OnboardingStepId, OnboardingSubmission } from "@/features/onboarding/model";
import {
  useOnboardingStateQuery,
  useProjectsQuery,
  useSettingsOverviewQuery,
} from "@/hooks/convex-data";
import { coveringPlan } from "@stage/project-ui/settings/model";
import { useDesktopSession } from "@/hooks/engine/useDesktopSession";

type SessionProgress = { userId: string; completed: boolean; checkoutReturned: boolean };

/**
 * Product-tier gate for authenticated desktop users. The welcome flow is only for
 * free workspaces without projects; any free workspace that already has one or more
 * projects gets pushed to the paywall instead.
 */
export function useNonProOnboardingGate() {
  const projectsQuery = useProjectsQuery();
  const settingsOverviewQuery = useSettingsOverviewQuery();
  const onboardingStateQuery = useOnboardingStateQuery();
  const session = useDesktopSession();
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [onboardingInitialStep, setOnboardingInitialStep] = useState<OnboardingStepId>("welcome");
  // What happened in this app session, tied to the account it happened for. Signing in
  // with another account (or a re-created one) starts clean instead of inheriting it.
  const [sessionProgress, setSessionProgress] = useState<SessionProgress>();
  const userId = session.data?.userId;
  const progress = sessionProgress?.userId === userId ? sessionProgress : undefined;
  const hasCompletedOnboarding = progress?.completed === true;
  const checkoutReturned = progress?.checkoutReturned === true;

  useEffect(() => {
    if (session.isLoading || !session.data?.hasAccessToken) {
      setOnboardingOpen(false);
      return;
    }

    if (
      projectsQuery.isLoading ||
      settingsOverviewQuery.isLoading ||
      onboardingStateQuery.isLoading
    ) {
      return;
    }

    const projectCount = projectsQuery.data?.length ?? 0;
    const isPaid = coveringPlan(settingsOverviewQuery.data) !== "free";
    const isOnboardingCompleted =
      hasCompletedOnboarding || (onboardingStateQuery.data?.isCompleted ?? false);

    if (isPaid) {
      setOnboardingOpen(false);
      return;
    }

    // Free plan cannot use the app. Brand-new users still get the welcome flow
    // (which ends at the paywall); anyone who already onboarded or has a project
    // goes straight to the paywall. The paywall has no "continue free" exit — it
    // requires starting a trial/subscription (see OnboardingPaywall).
    setOnboardingInitialStep(
      isOnboardingCompleted || projectCount >= 1 || checkoutReturned ? "paywall" : "welcome",
    );
    setOnboardingOpen(true);
  }, [
    hasCompletedOnboarding,
    checkoutReturned,
    session.isLoading,
    session.data?.hasAccessToken,
    projectsQuery.isLoading,
    projectsQuery.data,
    settingsOverviewQuery.isLoading,
    settingsOverviewQuery.data,
    onboardingStateQuery.isLoading,
    onboardingStateQuery.data,
  ]);

  const onOnboardingComplete = useCallback(
    (_submission: OnboardingSubmission) => {
      if (userId) setSessionProgress({ userId, completed: true, checkoutReturned });
      setOnboardingOpen(false);
    },
    [userId, checkoutReturned],
  );

  const notifyCheckoutReturned = useCallback(() => {
    if (userId) setSessionProgress({ userId, completed: hasCompletedOnboarding, checkoutReturned: true });
  }, [userId, hasCompletedOnboarding]);

  return {
    onboardingOpen,
    onboardingInitialStep,
    userFirstName: session.data?.name?.split(" ")[0],
    onOnboardingComplete,
    notifyCheckoutReturned,
  };
}
