import { createFileRoute } from "@tanstack/react-router";
import { ProjectStitchPage } from "@/components/project/ProjectStitchPage";

export const Route = createFileRoute("/_authed/project/$id/stitch")({
  component: ProjectStitchPage,
});
