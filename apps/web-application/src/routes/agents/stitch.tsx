import { createFileRoute } from "@tanstack/react-router";
import { StitchPage } from "@/components/agents/StitchPage";

export const Route = createFileRoute("/agents/stitch")({
  component: StitchPage,
});
