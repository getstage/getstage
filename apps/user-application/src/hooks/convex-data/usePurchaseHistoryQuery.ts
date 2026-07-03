import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { z } from "zod";
import { useDesktopAuth } from "@/lib/auth";
import { api } from "@/lib/convexApi";

const purchaseHistoryItemSchema = z.object({
  id: z.string(),
  description: z.string(),
  status: z.string(),
  amountCents: z.number(),
  currency: z.string(),
  createdAt: z.number(),
  credits: z.number(),
});

export const purchaseHistorySchema = z.array(purchaseHistoryItemSchema);
export type PurchaseHistoryItem = z.infer<typeof purchaseHistoryItemSchema>;

// Top-up purchases synced from Stripe (checkout.session.completed, mode=payment).
// `data` is undefined while loading so the table can distinguish loading from empty.
export function usePurchaseHistoryQuery() {
  const { isAuthenticated, isLoading: isAuthLoading } = useDesktopAuth();
  const { data, isPending } = useQuery(
    convexQuery(api.credits.getPurchaseHistory, isAuthenticated ? {} : "skip"),
  );
  const parsed = useMemo<PurchaseHistoryItem[] | undefined>(
    () => (data === undefined ? undefined : purchaseHistorySchema.parse(data)),
    [data],
  );

  return {
    data: parsed,
    isLoading: isAuthLoading || (isAuthenticated && isPending),
    error: null,
  };
}
