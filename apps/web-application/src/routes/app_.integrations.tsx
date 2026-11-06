import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "react-helmet-async";
import { IntegrationsPage } from "@/components/mcp/IntegrationsPage";
import { RequireApp } from "@/components/mcp/RequireApp";

export const Route = createFileRoute("/app_/integrations")({
  component: () => (
    <RequireApp path="/app/integrations">
      <Helmet><title>Integrations — Stage</title><meta name="robots" content="noindex, nofollow" /></Helmet>
      <IntegrationsPage />
    </RequireApp>
  ),
});
