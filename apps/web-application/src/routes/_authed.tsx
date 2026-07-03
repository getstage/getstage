import { redirect, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authed")({
  beforeLoad: () => {
    throw redirect({ to: "/download/mac", replace: true });
  },
});
