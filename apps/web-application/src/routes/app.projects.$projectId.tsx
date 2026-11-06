import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "react-helmet-async";
import type { Id } from "@stage/data-ops/convex/data-model";
import { PROJECT_STEP_IDS, ProjectView, type ProjectStepId } from "@/components/mcp/ProjectView";

export const Route = createFileRoute("/app/projects/$projectId")({
  validateSearch: (search: Record<string, unknown>): { step?: ProjectStepId } => ({
    step: PROJECT_STEP_IDS.find((step) => step === search.step),
  }),
  component: function ProjectRoute() {
    const { projectId } = Route.useParams();
    const { step } = Route.useSearch();
    return (
      <>
        <Helmet><title>Project — Stage</title></Helmet>
        <ProjectView projectId={projectId as Id<"projects">} step={step ?? "research"} />
      </>
    );
  },
});
