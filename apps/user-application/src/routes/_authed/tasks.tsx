import { Outlet, createFileRoute, useMatches } from "@tanstack/react-router";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "@/lib/convexApi";
import { TasksPageView } from "@/components/tasks/TasksPageView";

export const Route = createFileRoute("/_authed/tasks")({
  loader: async ({ context: { queryClient } }) => {
    await Promise.all([
      queryClient.ensureQueryData(convexQuery(api.desktop.listUserTasks, { limit: 100 })),
      queryClient.ensureQueryData(convexQuery(api.desktop.listProjects, {})),
    ]);
  },
  component: TasksRoute,
});

function TasksRoute() {
  const matches = useMatches();

  return matches.at(-1)?.routeId === "/_authed/tasks" ? <TasksPageView /> : <Outlet />;
}