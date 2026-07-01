import { Outlet, createFileRoute, useMatches } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import type { Id } from "@stage/data-ops/convex/data-model";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "@/lib/convexApi";
import { SHOULD_QUERY_PROJECT_AI_ARTIFACTS } from "@/lib/project/shouldQueryProjectAiArtifacts";
import { TabLoadingState } from "@/components/project/tabs/TabLoadingState";

const ProjectDetailView = lazy(() =>
  import("@/components/project/ProjectDetailView").then((module) => ({
    default: module.ProjectDetailView,
  })),
);

export const Route = createFileRoute("/_authed/project/$projectId")({
  loader: async ({ params, context: { queryClient } }) => {
    const projectId = params.projectId as Id<"projects">;
    const alwaysOn = [
      queryClient.ensureQueryData(convexQuery(api.desktop.getProjectData, { projectId })),
      queryClient.ensureQueryData(convexQuery(api.settings.getOverview, {})),
    ];
    const artifacts = SHOULD_QUERY_PROJECT_AI_ARTIFACTS
      ? [
          queryClient.ensureQueryData(
            convexQuery(api.projectAi.getLatestResearchArtifact, { projectId }),
          ),
          queryClient.ensureQueryData(
            convexQuery(api.projectAi.getLatestStrategyArtifact, { projectId }),
          ),
          queryClient.ensureQueryData(
            convexQuery(api.projectAi.getLatestMoodboardArtifact, { projectId }),
          ),
          queryClient.ensureQueryData(
            convexQuery(api.projectAi.getLatestFlowsArtifact, { projectId }),
          ),
          queryClient.ensureQueryData(
            convexQuery(api.projectAi.getLatestWireframesArtifact, { projectId }),
          ),
          queryClient.ensureQueryData(
            convexQuery(api.projectAi.getLatestAssetsArtifact, { projectId }),
          ),
          queryClient.ensureQueryData(
            convexQuery(api.projectAi.listRuns, { projectId, module: "moodboard" }),
          ),
          queryClient.ensureQueryData(
            convexQuery(api.projectAi.listRuns, { projectId, module: "styleguide" }),
          ),
          queryClient.ensureQueryData(
            convexQuery(api.projectAi.getContext, { projectId }),
          ),
        ]
      : [];

    await Promise.all([...alwaysOn, ...artifacts]);
  },
  component: ProjectRoute,
});

function ProjectRoute() {
  const matches = useMatches();

  return matches.at(-1)?.routeId === "/_authed/project/$projectId"
    ? (
        <Suspense fallback={<TabLoadingState label="Loading project..." />}>
          <ProjectDetailView />
        </Suspense>
      )
    : <Outlet />;
}