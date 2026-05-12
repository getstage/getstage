import { createFileRoute } from "@tanstack/react-router";
import { ProjectDetailsView } from "@/project/components/ProjectDetailsView";

export const Route = createFileRoute("/_authed/project/$projectId/details")({
  component: ProjectDetailsView,
});
