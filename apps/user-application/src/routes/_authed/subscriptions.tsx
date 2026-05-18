import { createFileRoute } from "@tanstack/react-router";
import { SubscriptionsPageView } from "@/subscriptions/components/SubscriptionsPageView";

export const Route = createFileRoute("/_authed/subscriptions")({
  component: SubscriptionsPageView,
});
