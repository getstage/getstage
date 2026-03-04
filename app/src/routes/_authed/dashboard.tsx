import { createFileRoute } from "@tanstack/react-router";
import { DashboardPage } from "@/components/dashboard/DashboardPage";

export const Route = createFileRoute("/_authed/dashboard")({
  component: DashboardPage,
});
