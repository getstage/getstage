import { createFileRoute, redirect } from "@tanstack/react-router";
import { AgentsPage } from "@/components/agents/AgentsPage";

export const Route = createFileRoute("/agents/")({
  beforeLoad: () => {
    throw redirect({ to: "/", replace: true });
  },
  component: AgentsPage,
});
