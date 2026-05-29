import type { ProjectType } from "@/types";

export const ONBOARDING_ICON_SRC = {
  dots: "/logos/dots.svg",
  download: "/logos/download.svg",
} as const;

export const FIGMA_PROJECT_TYPE_VALUES: ProjectType[] = [
  "branding",
  "web-design",
  "product-design",
  "app-design",
  "packaging",
  "motion-design",
  "illustration",
  "other",
];
