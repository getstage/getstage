import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "react-helmet-async";
import { ProjectsPage } from "@/components/mcp/ProjectsPage";

export const Route = createFileRoute("/app/_authed/projects/")({
  component: () => (
    <>
      <Helmet><title>Projects — Stage</title></Helmet>
      <ProjectsPage />
    </>
  ),
});
