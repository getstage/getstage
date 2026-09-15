import { createFileRoute, redirect } from "@tanstack/react-router";
import { StitchPage } from "@/components/agents/StitchPage";

export const Route = createFileRoute("/agents/stitch")({
  beforeLoad: () => {
    throw redirect({ to: "/", replace: true });
  },
  component: StitchPage,
});
