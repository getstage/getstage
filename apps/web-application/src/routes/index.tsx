import { createFileRoute } from "@tanstack/react-router";
import { StageLandingPage } from "@/components/stage-landing/StageLandingPage";

export const Route = createFileRoute("/")({
  component: StageLandingPage,
});
