import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { z } from "zod";
import { useDesktopAuth } from "@/lib/auth";
import { api } from "@/lib/convexApi";

const creditSummarySchema = z.object({
  total: z.number(),
  monthly: z.number(),
  topup: z.number(),
  usedByKind: z.object({
    voice: z.number(),
    moodboard: z.number(),
    reference: z.number(),
    other: z.number(),
  }),
});

export type CreditSummary = z.infer<typeof creditSummarySchema>;

// Credit balance for the signed-in user's workspace. `data` is undefined while
// loading (tri-state) so the widget can distinguish loading from an empty wallet.
export function useCreditSummaryQuery() {
  const { isAuthenticated, isLoading: isAuthLoading } = useDesktopAuth();
  const { data: summary, isPending } = useQuery(
    convexQuery(api.credits.getCreditSummary, isAuthenticated ? {} : "skip"),
  );
  const data = useMemo<CreditSummary | undefined>(
    () => (summary === undefined ? undefined : creditSummarySchema.parse(summary)),
    [summary],
  );

  return {
    data,
    isLoading: isAuthLoading || (isAuthenticated && isPending),
    error: null,
  };
}
