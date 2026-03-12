import { useEffect, useState } from "react";
import type { PreviewStage } from "@/features/dashboard/selectors";

const ONBOARDING_STORAGE_KEY = "stage:onboarding-preview";

export function useDashboardPreviewState({
  userId,
  previewEligible,
  onboardingCompleted,
}: {
  userId?: string;
  previewEligible: boolean;
  onboardingCompleted?: boolean;
}) {
  const [previewStage, setPreviewStage] = useState<PreviewStage>("onboarding");
  const previewStorageKey = userId ? `${ONBOARDING_STORAGE_KEY}:${userId}` : null;

  useEffect(() => {
    if (!previewEligible || !previewStorageKey) {
      return;
    }

    const savedStage = window.localStorage.getItem(previewStorageKey);
    const defaultStage: PreviewStage = onboardingCompleted ? "paywall" : "onboarding";
    if (savedStage === "onboarding" || savedStage === "paywall" || savedStage === "preview") {
      setPreviewStage(onboardingCompleted && savedStage === "onboarding" ? "paywall" : savedStage);
      return;
    }

    setPreviewStage(defaultStage);
  }, [onboardingCompleted, previewEligible, previewStorageKey]);

  useEffect(() => {
    if (!previewEligible || !previewStorageKey) {
      return;
    }

    window.localStorage.setItem(previewStorageKey, previewStage);
  }, [previewEligible, previewStage, previewStorageKey]);

  return {
    previewStage,
    setPreviewStage,
  };
}
