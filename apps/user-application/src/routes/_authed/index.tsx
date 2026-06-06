import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const DashboardContextView = lazy(() =>
  import("@/components/app/DashboardContextView").then((module) => ({
    default: module.DashboardContextView,
  })),
);

export const Route = createFileRoute("/_authed/")({
  component: DashboardRoute,
});

function DashboardRoute() {
  return (
    <Suspense fallback={<RouteFallback label="Loading dashboard..." />}>
      <DashboardContextView />
    </Suspense>
  );
}

function RouteFallback({ label }: { label: string }) {
  return (
    <div className="flex flex-1 items-center justify-center px-[clamp(16px,7vw,100px)] py-[clamp(20px,4vw,44px)]">
      <p className="text-[13px] font-medium text-[#737373]">{label}</p>
    </div>
  );
}
