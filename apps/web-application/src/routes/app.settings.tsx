import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "react-helmet-async";
import { SettingsPage } from "@/components/mcp/SettingsPage";

export const Route = createFileRoute("/app/settings")({
  component: () => (
    <>
      <Helmet><title>Settings — Stage</title></Helmet>
      <SettingsPage />
    </>
  ),
});
