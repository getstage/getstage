import { createFileRoute } from "@tanstack/react-router";
import { LandingPage } from "@/components/landing/LandingPage";

export const Route = createFileRoute("/")({
  component: IndexRoute,
});

function IndexRoute() {
  return <LandingPage />;
}
