import { createFileRoute } from "@tanstack/react-router";
import { ProjectCreationPage } from "@/components/creation/ProjectCreationPage";

export const Route = createFileRoute("/_app/new-project")({
  component: ProjectCreationPage,
});
