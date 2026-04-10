import { createFileRoute } from "@tanstack/react-router";
import { ClaudeConnectPage } from "@/components/agents/ClaudeConnectPage";

export const Route = createFileRoute("/agents/claude")({
  component: ClaudeConnectPage,
});
