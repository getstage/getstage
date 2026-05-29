import { useMemo } from "react";
import { useQuery } from "convex/react";
import { z } from "zod";
import { useDesktopAuth } from "@/lib/auth";
import { api } from "@/lib/convexApi";

const planSchema = z.enum(["free", "pro"]);

const settingsOverviewSchema = z.object({
  profile: z.object({
    id: z.string().min(1),
    email: z.string(),
    name: z.string(),
    avatarUrl: z.string().nullable(),
    role: z.string(),
    plan: planSchema,
  }),
  subscription: z.object({
    plan: planSchema,
    status: z.string(),
    provider: z.string(),
    billingCycle: z.string(),
    currentPeriodEnd: z.number().nullable().optional(),
    cancelAtPeriodEnd: z.boolean(),
    paymentMethodBrand: z.string().nullable(),
    paymentMethodLast4: z.string().nullable(),
    stripeCustomerId: z.string().nullable(),
    stripeSubscriptionId: z.string().nullable(),
    stripePriceId: z.string().nullable(),
  }).nullable(),
  paymentConnection: z.object({
    provider: z.string(),
    status: z.string(),
  }).nullable(),
  portalBranding: z.object({
    logoUrl: z.string().nullable(),
    accentColor: z.string(),
  }),
  previewPortalUrl: z.string().nullable(),
});

export type SettingsOverview = z.infer<typeof settingsOverviewSchema>;

export function useSettingsOverviewQuery() {
  const { isAuthenticated, isLoading: isAuthLoading } = useDesktopAuth();
  const overview = useQuery(api.settings.getOverview, isAuthenticated ? {} : "skip");
  const data = useMemo<SettingsOverview | undefined>(
    () => overview === undefined ? undefined : settingsOverviewSchema.parse(overview),
    [overview],
  );

  return {
    data,
    isLoading: isAuthLoading || (isAuthenticated && overview === undefined),
    error: null,
  };
}
