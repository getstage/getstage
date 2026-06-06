import { Outlet, createFileRoute, useMatches } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const ProjectDetailView = lazy(() =>
  import("@/components/project/ProjectDetailView").then((module) => ({
    default: module.ProjectDetailView,
  })),
);

export const Route = createFileRoute("/_authed/project/$projectId")({
  component: ProjectRoute,
});

function ProjectRoute() {
  const matches = useMatches();

  return matches.at(-1)?.routeId === "/_authed/project/$projectId"
    ? (
        <Suspense fallback={<RouteFallback label="Loading project..." />}>
          <ProjectDetailView />
        </Suspense>
      )
    : <Outlet />;
}

function RouteFallback({ label }: { label: string }) {
  return (
    <div className="flex flex-1 items-center justify-center px-[clamp(16px,7vw,100px)] py-[clamp(20px,4vw,44px)]">
      <p className="text-[13px] font-medium text-[#737373]">{label}</p>
    </div>
  );
}
