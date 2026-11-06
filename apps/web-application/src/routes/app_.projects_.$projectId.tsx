import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Helmet } from "react-helmet-async";
import type { Id } from "@stage/data-ops/convex/data-model";
import { PROJECT_STEP_IDS, ProjectView } from "@/components/mcp/ProjectView";
import { RequireApp } from "@/components/mcp/RequireApp";

type Step = (typeof PROJECT_STEP_IDS)[number];

export const Route = createFileRoute("/app_/projects_/$projectId")({
  validateSearch: (search: Record<string, unknown>): { step: Step } => ({
    step: PROJECT_STEP_IDS.find((step) => step === search.step) ?? "research",
  }),
  component: ProjectRoute,
});

function ProjectRoute() {
  const { projectId } = Route.useParams();
  const { step } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  return (
    <RequireApp path="/app/projects">
      <Helmet><title>Project — Stage</title><meta name="robots" content="noindex, nofollow" /></Helmet>
      <ProjectView projectId={projectId as Id<"projects">} step={step} onStep={(next) => void navigate({ search: { step: next }, replace: true })} />
    </RequireApp>
  );
}
