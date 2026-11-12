import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "react-helmet-async";
import type { Id } from "@stage/data-ops/convex/data-model";
import { PROJECT_PAGE_TABS, type ProjectTab } from "@stage/project-ui/project";
import { ProjectView } from "@/components/mcp/ProjectView";

export const Route = createFileRoute("/app/_authed/projects/$projectId")({
  validateSearch: (search: Record<string, unknown>): { tab?: ProjectTab } => ({
    tab: PROJECT_PAGE_TABS.find((tab) => tab.key === search.tab)?.key,
  }),
  component: function ProjectRoute() {
    const { projectId } = Route.useParams();
    const { tab } = Route.useSearch();
    return (
      <>
        <Helmet><title>Project — Stage</title></Helmet>
        <ProjectView projectId={projectId as Id<"projects">} tab={tab ?? "overview"} />
      </>
    );
  },
});
