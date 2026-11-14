import { createFileRoute } from "@tanstack/react-router";
import { McpGuidePage } from "@/components/marketing/McpGuidePage";

export const Route = createFileRoute("/mcp")({
  component: McpGuidePage,
});
