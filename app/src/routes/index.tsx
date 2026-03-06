import { Navigate, createFileRoute } from "@tanstack/react-router";
import { useConvexAuth } from "convex/react";
import { LandingPage } from "@/components/landing/LandingPage";

export const Route = createFileRoute("/")({
  component: IndexRoute,
});

function IndexRoute() {
  const { isAuthenticated } = useConvexAuth();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <LandingPage />;
}
