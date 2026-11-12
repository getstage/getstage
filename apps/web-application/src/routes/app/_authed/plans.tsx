import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "react-helmet-async";
import { SubscriptionsPageView } from "@stage/project-ui/billing/SubscriptionsPageView";

// Stage for Mac's plans page on the web (Settings → Billing → Change plan).
export const Route = createFileRoute("/app/_authed/plans")({
  validateSearch: (search: Record<string, unknown>): { from?: "teams" } => (search.from === "teams" ? { from: "teams" } : {}),
  component: function PlansRoute() {
    return (
      <>
        <Helmet><title>Plans — Stage</title></Helmet>
        <SubscriptionsPageView teamOnly={Route.useSearch().from === "teams"} />
      </>
    );
  },
});
