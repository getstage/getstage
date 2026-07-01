import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "@/lib/convexApi";
import { TabLoadingState } from "@/components/project/tabs/TabLoadingState";

const DashboardContextView = lazy(() =>
  import("@/components/app/DashboardContextView").then((module) => ({
    default: module.DashboardContextView,
  })),
);

export const Route = createFileRoute("/_authed/")({
  loader: async ({ context: { queryClient } }) => {
    await Promise.all([
      queryClient.ensureQueryData(convexQuery(api.desktop.listProjects, {})),
      queryClient.ensureQueryData(convexQuery(api.desktop.listUserTasks, { limit: 200 })),
    ]);
  },
  component: DashboardRoute,
});

function DashboardRoute() {
  return (
    <Suspense fallback={<TabLoadingState label="Loading dashboard..." />}>
      <DashboardContextView />
    </Suspense>
  );
}