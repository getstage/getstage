import type { ProjectTab } from "../models/project";

export const PROJECT_PAGE_TABS: { key: ProjectTab; label: string; iconSrc: string }[] = [
  { key: "overview", label: "Overview", iconSrc: "/logos/dashboard/overview.svg" },
  { key: "research", label: "Research", iconSrc: "/logos/dashboard/research.svg" },
  { key: "strategy", label: "Strategy", iconSrc: "/logos/dashboard/strategy.svg" },
  { key: "moodboard", label: "Moodboard", iconSrc: "/logos/dashboard/moodboard.svg" },
  { key: "flows", label: "Flows", iconSrc: "/logos/dashboard/flows.svg" },
  { key: "wireframes", label: "Wireframes", iconSrc: "/logos/dashboard/generate.svg" },
  { key: "assets", label: "Assets", iconSrc: "/logos/dashboard/assets.svg" },
];
