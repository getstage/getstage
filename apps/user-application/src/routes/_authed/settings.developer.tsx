import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authed/settings/developer")({
  beforeLoad: () => {
    throw redirect({ to: "/integrations" });
  },
});
