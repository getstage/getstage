import { createFileRoute } from "@tanstack/react-router";
import { SkillsPage } from "@/components/agents/SkillsPage";

export const Route = createFileRoute("/agents/skills")({
  component: SkillsPage,
});
