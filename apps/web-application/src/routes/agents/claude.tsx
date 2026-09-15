import { createFileRoute, redirect } from "@tanstack/react-router";
import { ClaudeConnectPage } from "@/components/agents/ClaudeConnectPage";

export const Route = createFileRoute("/agents/claude")({
  beforeLoad: () => {
    throw redirect({ to: "/", replace: true });
  },
  component: ClaudeConnectPage,
});
