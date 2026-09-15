import { createFileRoute, redirect } from "@tanstack/react-router";
import { SkillsPage } from "@/components/agents/SkillsPage";

export const Route = createFileRoute("/agents/skills")({
  beforeLoad: () => {
    throw redirect({ to: "/", replace: true });
  },
  component: SkillsPage,
});
