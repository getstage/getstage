import { Outlet, createFileRoute, useMatches } from "@tanstack/react-router";
import { TasksPageView } from "@/tasks/components/TasksPageView";

export const Route = createFileRoute("/_authed/tasks")({
  component: TasksRoute,
});

function TasksRoute() {
  const matches = useMatches();

  return matches.at(-1)?.routeId === "/_authed/tasks" ? <TasksPageView /> : <Outlet />;
}
