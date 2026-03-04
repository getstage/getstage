import { createFileRoute } from "@tanstack/react-router";
import { ProjectDetailPage } from "@/components/project/ProjectDetailPage";

export const Route = createFileRoute("/_authed/project/$id")({
  component: ProjectDetailPage,
});
