import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "react-helmet-async";
import { IntegrationsPage } from "@/components/mcp/IntegrationsPage";

export const Route = createFileRoute("/app/integrations")({
  component: () => (
    <>
      <Helmet><title>Integrations — Stage</title></Helmet>
      <IntegrationsPage />
    </>
  ),
});
