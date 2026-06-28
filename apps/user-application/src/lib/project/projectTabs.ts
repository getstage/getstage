import type { ProjectTab } from "@/models/project/project";

export const PROJECT_PAGE_TABS: { key: ProjectTab; label: string; iconSrc: string }[] = [
  { key: "overview", label: "Overview", iconSrc: "/logos/dashboard/overview.svg" },
  { key: "research", label: "Research", iconSrc: "/logos/dashboard/research.svg" },
  { key: "strategy", label: "Strategy", iconSrc: "/logos/dashboard/strategy.svg" },
  { key: "moodboard", label: "Moodboard", iconSrc: "/logos/dashboard/moodboard.svg" },
  { key: "flows", label: "Flows", iconSrc: "/logos/dashboard/flows.svg" },
  { key: "wireframes", label: "Wireframes", iconSrc: "/logos/dashboard/wireframes.svg" },
  { key: "assets", label: "Assets", iconSrc: "/logos/dashboard/assets.svg" },
];

// The toggleable workflow steps. "overview" is the project home — always shown, never stored
// in enabledSteps — so it is excluded here.
export const WORKFLOW_TABS = PROJECT_PAGE_TABS.filter((tab) => tab.key !== "overview");

/** The tabs to render in the project nav: Overview plus every enabled step. */
export function getEnabledProjectTabs(enabledSteps: readonly string[]) {
  return PROJECT_PAGE_TABS.filter((tab) => tab.key === "overview" || enabledSteps.includes(tab.key));
}
