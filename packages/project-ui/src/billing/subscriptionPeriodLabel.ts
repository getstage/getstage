type SubscriptionPeriodInput = {
  status?: string | null;
  cancelAtPeriodEnd?: boolean;
};

export function subscriptionPeriodLabel(
  subscription: SubscriptionPeriodInput | null | undefined,
  variant: "billing" | "sidebar" = "billing",
): string {
  if (!subscription) {
    return variant === "sidebar" ? "Renews" : "Renews on";
  }

  if (subscription.cancelAtPeriodEnd || subscription.status === "cancelling") {
    return variant === "sidebar" ? "Access until" : "Access until";
  }

  if (subscription.status === "trialing") {
    return variant === "sidebar" ? "Trial ends" : "Trial ends";
  }

  return variant === "sidebar" ? "Renews" : "Renews on";
}

export function formatSubscriptionPeriodDate(
  timestampMs: number | null | undefined,
  variant: "billing" | "sidebar" = "billing",
): string {
  if (!timestampMs) {
    return "—";
  }

  return new Date(timestampMs).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(variant === "billing" ? { year: "numeric" as const } : {}),
  });
}
