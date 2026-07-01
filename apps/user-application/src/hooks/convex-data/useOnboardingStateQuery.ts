import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { z } from "zod";
import { useDesktopAuth } from "@/lib/auth";
import { api } from "@/lib/convexApi";

const onboardingStateSchema = z.object({
  workCategory: z.string().nullable(),
  completedAt: z.number().nullable(),
  projectCreatedAt: z.number().nullable(),
  paywallSeenAt: z.number().nullable(),
  isCompleted: z.boolean(),
});

export type OnboardingState = z.infer<typeof onboardingStateSchema>;

export function useOnboardingStateQuery() {
  const { isAuthenticated, isLoading: isAuthLoading } = useDesktopAuth();
  const { data: onboardingState, isPending } = useQuery(
    convexQuery(api.onboarding.getState, isAuthenticated ? {} : "skip"),
  );
  const data = useMemo<OnboardingState | undefined>(
    () =>
      onboardingState === undefined
        ? undefined
        : onboardingStateSchema.parse(onboardingState),
    [onboardingState],
  );

  return {
    data,
    isLoading: isAuthLoading || (isAuthenticated && isPending),
    error: null,
  };
}