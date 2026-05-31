import type { ScreenItem } from "@/types/project/wireframesTab";

export const FIGMA_SYMBOL_URL =
  "https://www.figma.com/api/mcp/asset/0fb6d4b5-4b4a-43dd-b78a-56971a159d3f";

export const MOCK_SCREENS: ScreenItem[] = [
  {
    id: "homepage",
    title: "Homepage",
    description: "Primary Landing - communicates value, drives demo conversion",
    kind: "Page",
    priority: "P0",
    required: true,
    selected: true,
  },
  {
    id: "about",
    title: "About Us",
    description: "Describes company mission and vision",
    kind: "Section",
    priority: "P1",
    required: false,
    selected: true,
  },
  {
    id: "features",
    title: "Features",
    description: "Highlights key functionalities, engages users",
    kind: "Page",
    priority: "P2",
    required: true,
    selected: true,
  },
  {
    id: "pricing",
    title: "Pricing",
    description: "Details pricing tiers, promotes sign-up",
    kind: "Page",
    priority: "P3",
    required: true,
    selected: true,
  },
  {
    id: "testimonials",
    title: "Testimonials",
    description: "Showcases user feedback, builds trust",
    kind: "Section",
    priority: "P4",
    required: false,
    selected: true,
  },
  {
    id: "blog",
    title: "Blog",
    description: "Provides insights, fosters community engagement",
    kind: "Page",
    priority: "P5",
    required: false,
    selected: true,
  },
  {
    id: "contact",
    title: "Contact Us",
    description: "Facilitates inquiries, supports user needs",
    kind: "Section",
    priority: "P6",
    required: true,
    selected: true,
  },
];
