import { createFileRoute } from "@tanstack/react-router";
import { StageV2LandingPage } from "@/components/landing-v2/StageV2LandingPage";

export const Route = createFileRoute("/")({
  component: IndexRoute,
});

function IndexRoute() {
  return <StageV2LandingPage />;
}
