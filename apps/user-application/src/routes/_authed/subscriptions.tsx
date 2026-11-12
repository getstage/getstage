import { createFileRoute } from "@tanstack/react-router";
import { SubscriptionsPageView } from "@stage/project-ui/billing/SubscriptionsPageView";

export const Route = createFileRoute("/_authed/subscriptions")({
  validateSearch: (search: Record<string, unknown>): { from?: "teams" } =>
    search.from === "teams" ? { from: "teams" } : {},
  component: function SubscriptionsRoute() {
    return <SubscriptionsPageView teamOnly={Route.useSearch().from === "teams"} />;
  },
});
