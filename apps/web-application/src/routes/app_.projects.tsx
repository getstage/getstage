import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "react-helmet-async";
import { ProjectsPage } from "@/components/mcp/ProjectsPage";
import { RequireApp } from "@/components/mcp/RequireApp";

export const Route = createFileRoute("/app_/projects")({
  component: () => (
    <RequireApp path="/app/projects">
      <Helmet><title>Projects — Stage</title><meta name="robots" content="noindex, nofollow" /></Helmet>
      <ProjectsPage />
    </RequireApp>
  ),
});
