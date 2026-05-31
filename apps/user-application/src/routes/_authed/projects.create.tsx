import { createFileRoute } from "@tanstack/react-router";
import { CreateProjectView } from "@/components/project/CreateProjectView";

export const Route = createFileRoute("/_authed/projects/create")({
  component: CreateProjectView,
});
