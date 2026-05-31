import { createFileRoute } from "@tanstack/react-router";
import { SubscriptionsPageView } from "@/components/subscriptions/SubscriptionsPageView";

export const Route = createFileRoute("/_authed/subscriptions")({
  component: SubscriptionsPageView,
});
