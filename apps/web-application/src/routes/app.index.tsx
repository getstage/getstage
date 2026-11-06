import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "react-helmet-async";
import { Dashboard } from "@/components/mcp/Dashboard";
import { MCP_TOOLS, type McpToolId } from "@/components/mcp/McpConnectCard";

export const Route = createFileRoute("/app/")({
  // `/app?tool=cursor` (from Integrations) opens the connect card on that tool.
  validateSearch: (search: Record<string, unknown>): { tool?: McpToolId } => ({
    tool: MCP_TOOLS.find((tool) => tool.id === search.tool)?.id,
  }),
  component: function DashboardRoute() {
    const { tool } = Route.useSearch();
    return (
      <>
        <Helmet><title>Dashboard — Stage</title></Helmet>
        <Dashboard tool={tool} />
      </>
    );
  },
});
