import { createFileRoute } from "@tanstack/react-router";
import { SubscriptionsPageView } from "@/components/subscriptions/SubscriptionsPageView";

export const Route = createFileRoute("/_authed/subscriptions")({
  validateSearch: (search: Record<string, unknown>): { from?: "teams" } =>
    search.from === "teams" ? { from: "teams" } : {},
  component: SubscriptionsPageView,
});
