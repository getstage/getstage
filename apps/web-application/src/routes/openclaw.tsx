import { createFileRoute, redirect } from "@tanstack/react-router";
import { OpenClawPage } from "@/components/openclaw/OpenClawPage";

export const Route = createFileRoute("/openclaw")({
  beforeLoad: () => {
    throw redirect({ to: "/", replace: true });
  },
  component: OpenClawPage,
});
