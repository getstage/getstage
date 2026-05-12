import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import type { OnboardingStepId, OnboardingSubmission } from "@/features/onboarding/model";
import { useProjectsQuery, useSettingsOverviewQuery } from "@/hooks/desktop-api";
import { useDesktopBridge } from "@/hooks/useDesktopBridge";
import { desktopSessionQueryKey } from "@/lib/desktopSession";

/**
 * Product-tier gate for authenticated desktop users: opens onboarding/paywall when
 * not Pro. Lives beside Convex-backed queries (`useProjectsQuery`,
 * `useSettingsOverviewQuery`); session uses React Query + `desktopSessionQueryKey`
 * so it stays aligned with router invalidation on `onSessionChanged`.
 */
export function useNonProOnboardingGate() {
  const desktop = useDesktopBridge();
  const projectsQuery = useProjectsQuery();
  const settingsOverviewQuery = useSettingsOverviewQuery();
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

    if (projectsQuery.isLoading || settingsOverviewQuery.isLoading) {
      return;
    }

    const hasProjects = (projectsQuery.data?.length ?? 0) > 0;
    const isPro = settingsOverviewQuery.data?.profile.plan === "pro";

    if (isPro) {
      setOnboardingOpen(false);
      return;
    }

    setOnboardingInitialStep(hasProjects ? "paywall" : "welcome");
    setOnboardingOpen(true);
  }, [
    session.isLoading,
    session.data?.hasAccessToken,
    projectsQuery.isLoading,
    projectsQuery.data,
    settingsOverviewQuery.isLoading,
    settingsOverviewQuery.data,
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
