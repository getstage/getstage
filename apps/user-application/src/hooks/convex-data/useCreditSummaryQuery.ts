import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { z } from "zod";
import { useDesktopAuth } from "@/lib/auth";
import { api } from "@/lib/convexApi";
import type { Id } from "@stage/data-ops/convex/data-model";
import { useActiveSpace } from "@/hooks/workspace/useActiveSpace";

const creditSummarySchema = z.object({
  total: z.number(),
  monthly: z.number(),
  topup: z.number(),
  granted: z.number(),
  usedTotal: z.number(),
  usedByKind: z.object({
    voice: z.number(),
    moodboard: z.number(),
    reference: z.number(),
    other: z.number(),
  }),
});

export type CreditSummary = z.infer<typeof creditSummarySchema>;

// Credit balance for the active space, the same wallet runs in that space are
// charged to. `data` is undefined while loading (tri-state) so the widget can
// distinguish loading from an empty wallet.
export function useCreditSummaryQuery() {
  const { isAuthenticated, isLoading: isAuthLoading } = useDesktopAuth();
  const { activeId } = useActiveSpace();
  const { data: summary, isPending } = useQuery(
    convexQuery(
      api.credits.getCreditSummary,
      isAuthenticated ? (activeId ? { spaceOwnerId: activeId as Id<"users"> } : {}) : "skip",
    ),
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
