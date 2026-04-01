import { createFileRoute } from "@tanstack/react-router";
import { OpenClawPage } from "@/components/openclaw/OpenClawPage";

export const Route = createFileRoute("/openclaw")({
  component: OpenClawPage,
});
