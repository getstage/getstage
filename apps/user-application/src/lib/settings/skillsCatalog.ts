export type IntegrationsHubTab = "tools" | "skills" | "components" | "marketplace";

export type SkillCatalogItem = {
  id: string;
  name: string;
  description: string;
  official: boolean;
  overlayTitle: string;
  meshSrc: string;
  defaultEnabled: boolean;
  category: string;
  installsLabel: string;
};

export type ComponentPackCatalogItem = {
  id: string;
  name: string;
  description: string;
  official: boolean;
  iconSrc: string;
  defaultEnabled: boolean;
  category: string;
  installsLabel: string;
  /** Stage Hi-Fi prompt hints only — not a skills.sh package */
  promptHint: string;
};

export const HUB_TAB_ICON_PATHS: Record<IntegrationsHubTab, string> = {
  tools: "/logos/skills/toolbox.svg",
  skills: "/logos/skills/magic-wand.svg",
  components: "/logos/skills/blocks.svg",
  marketplace: "/logos/skills/shopping-bag.svg",
};

const MESH = {
  warm: "/images/skills/mesh-warm.webp",
  cool: "/images/skills/mesh-cool.webp",
  green: "/images/skills/mesh-green.webp",
} as const;

/**
 * Curated Stage skill library (Werner’s list). Static — never scans local agent folders.
 */
export const DISCOVER_SKILL_CATALOG: readonly SkillCatalogItem[] = [
  {
    id: "design-taste-frontend",
    name: "Design Taste",
    overlayTitle: "<Design Taste>",
    description: "Leonxlnx taste skill — Stage’s default Hi-Fi anti-slop skill.",
    official: true,
    meshSrc: MESH.warm,
    defaultEnabled: true,
    category: "Design",
    installsLabel: "275.6K Installs",
  },
  {
    id: "frontend-design",
    name: "Frontend Design",
    overlayTitle: "<Frontend Design>",
    description: "Anthropic frontend-design skill for polished UI generation.",
    official: true,
    meshSrc: MESH.cool,
    defaultEnabled: false,
    category: "Design",
    installsLabel: "687.9K Installs",
  },
  {
    id: "ui-ux-pro-max",
    name: "UI UX Pro Max",
    overlayTitle: "<UI UX Pro Max>",
    description: "High-end UI/UX generation patterns from nextlevelbuilder.",
    official: true,
    meshSrc: MESH.green,
    defaultEnabled: false,
    category: "Design",
    installsLabel: "277.5K Installs",
  },
  {
    id: "impeccable",
    name: "Impeccable",
    overlayTitle: "<Impeccable>",
    description: "pbakaus impeccable design craft skills pack.",
    official: true,
    meshSrc: MESH.warm,
    defaultEnabled: false,
    category: "Design",
    installsLabel: "200.7K Installs",
  },
  {
    id: "emil-design-eng",
    name: "Emil Design Eng",
    overlayTitle: "<Emil Design Eng>",
    description: "emilkowalski design-engineering skills.",
    official: true,
    meshSrc: MESH.cool,
    defaultEnabled: false,
    category: "Design",
    installsLabel: "152.1K Installs",
  },
  {
    id: "design-motion-principles",
    name: "Design Motion Principles",
    overlayTitle: "<Design Motion Principles>",
    description: "Motion and interaction principles for product UI.",
    official: true,
    meshSrc: MESH.green,
    defaultEnabled: false,
    category: "Motion",
    installsLabel: "Curated",
  },
  {
    id: "shadcn-ui-skill",
    name: "shadcn/ui Skill",
    overlayTitle: "<shadcn/ui Skill>",
    description: "Stitch skill for shadcn-style component patterns (agent skill, not the library).",
    official: true,
    meshSrc: MESH.warm,
    defaultEnabled: false,
    category: "Design Systems",
    installsLabel: "45.5K Installs",
  },
] as const;

export const COMPONENT_PACK_CATALOG: readonly ComponentPackCatalogItem[] = [
  {
    id: "shadcn-ui",
    name: "shadcn/ui",
    description: "Accessible and customizable React components built with Radix UI and Tailwind CSS.",
    official: true,
    iconSrc: "/logos/component-packs/shadcn.jpg",
    defaultEnabled: true,
    category: "SaaS",
    installsLabel: "246.7K Installs",
    promptHint:
      "Prefer clean shadcn-like patterns: rounded-md controls, bordered cards, clear Label+Input forms, muted secondary text.",
  },
  {
    id: "radix-ui",
    name: "Radix UI",
    description: "Unstyled accessible primitives used to build modern design systems.",
    official: true,
    iconSrc: "/logos/component-packs/radix.svg",
    defaultEnabled: false,
    category: "SaaS",
    installsLabel: "989 Installs",
    promptHint:
      "Use accessible dialog/popover/select patterns with clear focus rings and semantic roles.",
  },
  {
    id: "magic-ui",
    name: "Magic UI",
    description: "Animated UI components and interaction patterns for modern applications.",
    official: true,
    iconSrc: "/logos/component-packs/magic-ui.svg",
    defaultEnabled: true,
    category: "SaaS",
    installsLabel: "543 Installs",
    promptHint:
      "Add restrained motion-ready structure (hero reveals, subtle card lift) without requiring JS in the HTML fragment.",
  },
  {
    id: "aceternity-ui",
    name: "Aceternity UI",
    description: "Beautiful components and layouts designed for SaaS and AI products.",
    official: true,
    iconSrc: "/logos/component-packs/aceternity.svg",
    defaultEnabled: true,
    category: "SaaS",
    installsLabel: "1.1K Installs",
    promptHint:
      "SaaS/AI product layouts: bold hero typography, feature bento sections, polished pricing and CTA blocks.",
  },
  {
    id: "kokonut-ui",
    name: "Kokonut UI",
    description: "Premium dashboard and SaaS components with polished visual patterns.",
    official: true,
    iconSrc: "/logos/component-packs/kokonut.svg",
    defaultEnabled: false,
    category: "SaaS",
    installsLabel: "Not listed on skills.sh",
    promptHint:
      "Dashboard/SaaS density: clear data panels, metric strips, and structured app chrome when screens are product UI.",
  },
  {
    id: "origin-ui",
    name: "Origin UI",
    description: "Production-ready Tailwind components and application blocks.",
    official: true,
    iconSrc: "/logos/component-packs/origin.svg",
    defaultEnabled: false,
    category: "SaaS",
    installsLabel: "Not listed on skills.sh",
    promptHint:
      "Application blocks with production spacing and clear section separators — practical, not decorative.",
  },
  {
    id: "mantine",
    name: "Mantine",
    description: "Comprehensive React component library with accessibility built in.",
    official: true,
    iconSrc: "/logos/component-packs/mantine.svg",
    defaultEnabled: false,
    category: "SaaS",
    installsLabel: "5.2K Installs",
    promptHint:
      "Accessible form and notification patterns with consistent control heights and readable contrast.",
  },
] as const;

export function defaultEnabledSkillIds(): string[] {
  return DISCOVER_SKILL_CATALOG.filter((s) => s.defaultEnabled).map((s) => s.id);
}

export function defaultInstalledSkillIds(): string[] {
  return DISCOVER_SKILL_CATALOG.filter((s) => s.defaultEnabled).map((s) => s.id);
}

export function defaultEnabledComponentPackIds(): string[] {
  return COMPONENT_PACK_CATALOG.filter((p) => p.defaultEnabled).map((p) => p.id);
}
