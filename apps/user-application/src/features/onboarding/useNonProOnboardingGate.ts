import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import type { OnboardingStepId, OnboardingSubmission } from "@/features/onboarding/model";
import {
  useOnboardingStateQuery,
  useProjectsQuery,
  useSettingsOverviewQuery,
} from "@/hooks/desktop-api";
import { useDesktopBridge } from "@/hooks/useDesktopBridge";
import { desktopSessionQueryKey } from "@/lib/desktopSession";

/**
 * Product-tier gate for authenticated desktop users. The welcome flow is only for
 * free workspaces without projects; any free workspace that already has one or more
 * projects gets pushed to the paywall instead.
 */
export function useNonProOnboardingGate() {
  const desktop = useDesktopBridge();
  const projectsQuery = useProjectsQuery();
  const settingsOverviewQuery = useSettingsOverviewQuery();
  const onboardingStateQuery = useOnboardingStateQuery();
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [onboardingInitialStep, setOnboardingInitialStep] = useState<OnboardingStepId>("welcome");

  const session = useQuery({
    queryKey: desktopSessionQueryKey,
    queryFn: () => desktop.auth.getSession(),
    retry: false,
  });

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
    const isPro = settingsOverviewQuery.data?.profile.plan === "pro";
    const isOnboardingCompleted = onboardingStateQuery.data?.isCompleted ?? false;

    if (isPro) {
      setOnboardingOpen(false);
      return;
    }

    if (projectCount >= 1) {
      setOnboardingInitialStep("paywall");
      setOnboardingOpen(true);
      return;
    }

    if (isOnboardingCompleted) {
      setOnboardingOpen(false);
      return;
    }

    setOnboardingInitialStep("welcome");
    setOnboardingOpen(true);
  }, [
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
    setOnboardingOpen(false);
  }, []);

  return {
    onboardingOpen,
    onboardingInitialStep,
    userFirstName: session.data?.name?.split(" ")[0],
    onOnboardingComplete,
  };
}
