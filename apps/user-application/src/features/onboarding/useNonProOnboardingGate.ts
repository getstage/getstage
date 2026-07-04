import { useCallback, useEffect, useState } from "react";
import type { OnboardingStepId, OnboardingSubmission } from "@/features/onboarding/model";
import {
  useOnboardingStateQuery,
  useProjectsQuery,
  useSettingsOverviewQuery,
} from "@/hooks/convex-data";
import { useDesktopSession } from "@/hooks/engine/useDesktopSession";

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
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [checkoutReturned, setCheckoutReturned] = useState(false);

  useEffect(() => {
    if (onboardingStateQuery.data?.isCompleted) {
      setHasCompletedOnboarding(true);
    }
  }, [onboardingStateQuery.data?.isCompleted]);

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
    const isPaid = settingsOverviewQuery.data?.profile.plan !== "free";
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

  const onOnboardingComplete = useCallback((_submission: OnboardingSubmission) => {
    setHasCompletedOnboarding(true);
    setOnboardingOpen(false);
  }, []);

  const notifyCheckoutReturned = useCallback(() => {
    setCheckoutReturned(true);
  }, []);

  return {
    onboardingOpen,
    onboardingInitialStep,
    userFirstName: session.data?.name?.split(" ")[0],
    onOnboardingComplete,
    notifyCheckoutReturned,
  };
}
