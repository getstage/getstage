import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/agents")({
  beforeLoad: () => {
    throw redirect({ to: "/", replace: true });
  },
  component: () => <Outlet />,
});
