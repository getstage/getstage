import { createFileRoute } from "@tanstack/react-router";
import { CreateProjectView } from "@/project/components/CreateProjectView";

export const Route = createFileRoute("/_authed/projects/create")({
  component: CreateProjectView,
});
