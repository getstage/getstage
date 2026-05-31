import { createFileRoute } from "@tanstack/react-router";
import { DashboardContextView } from "@/components/app/DashboardContextView";

export const Route = createFileRoute("/_authed/")({
  component: DashboardContextView,
});
