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
  /** Author or upstream project. Curated — never invented. */
  author: string;
  /** Upstream repository the Stage-adapted SKILL.md was distilled from. */
  sourceUrl: string;
  /** Long-form copy for the skill detail page. */
  longDescription: string;
  /** What Stage actually does with this skill when it is enabled. */
  features: readonly string[];
  bestFor: readonly string[];
  tags: readonly string[];
};

export type ComponentPackCatalogItem = {
  id: string;
  name: string;
  description: string;
  official: boolean;
  iconSrc: string;
  defaultEnabled: boolean;
  category: string;
  /**
   * Exclusivity axis for project selection. A project takes exactly one `base` pack and
   * at most one `sections` pack. `primitives` packs have no visual design of their own,
   * so they stay browsable in Integrations but are never offered in a project selector.
   */
  packKind: "base" | "sections" | "primitives" | "charts";
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
    author: "Leonxlnx",
    sourceUrl: "https://github.com/Leonxlnx/taste-skill",
    longDescription:
      "Design that looks decided, not generated. Taste is the skill that makes Stage design like a studio, not a chatbot. It enforces the choices that separate premium work from generic output: real typographic hierarchy, calibrated color, asymmetric layout, and restraint with motion. Turn it on for a project and every wireframe Stage generates carries the same considered, editorial feel.",
    features: [
      "Editorial typography and type scale",
      "Calibrated color and chosen neutrals",
      "Asymmetric, intentional layouts",
      "Tasteful motion and micro-interactions",
      "Kills generic AI patterns (centered everything, rounded-lg, gradient hero)",
      "Consistent spacing and rhythm",
    ],
    bestFor: ["Landing pages", "Marketing sites", "Portfolios", "Premium brand pages"],
    tags: ["typography", "layout", "aesthetics", "editorial"],
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
    author: "Anthropic",
    sourceUrl: "https://github.com/anthropics/skills/tree/main/skills/frontend-design",
    longDescription:
      "Treats every generated screen as shipped product UI rather than a mockup. Stage asks for the states real software has — empty, loading, error — and holds control sizing and copy to the same bar as the happy path.",
    features: [
      "Real empty, loading, and error states",
      "Consistent control sizing across a screen",
      "Copy that names the user's task",
    ],
    bestFor: ["Product UI", "Dashboards", "Settings screens"],
    tags: ["product-ui", "states", "polish"],
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
    author: "nextlevelbuilder",
    sourceUrl: "https://github.com/nextlevelbuilder/ui-ux-pro-max-skill",
    longDescription:
      "Orders a screen around intent. One primary action leads, sections follow the user's decision path, and everything secondary is visually subordinate instead of competing for the same attention.",
    features: [
      "One unmistakable primary action per screen",
      "Sections ordered by user intent",
      "Secondary actions kept visually subordinate",
    ],
    bestFor: ["Conversion pages", "Onboarding", "Checkout"],
    tags: ["ux", "hierarchy", "conversion"],
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
    author: "pbakaus",
    sourceUrl: "https://github.com/pbakaus/impeccable",
    longDescription:
      "A craft pass on top of a working layout. Optical alignment, consistent icon weight, balanced whitespace, and no orphaned or widowed lines in headings — the details people feel before they can name them.",
    features: [
      "Optical alignment over mathematical alignment",
      "Consistent icon weight and size",
      "Balanced whitespace",
      "No orphaned or widowed heading lines",
    ],
    bestFor: ["Brand pages", "Case studies", "Pitch surfaces"],
    tags: ["craft", "detail", "polish"],
  },
  {
    id: "emil-design-eng",
    name: "Emil Design Eng",
    overlayTitle: "<Emil Design Eng>",
    description: "emilkowalski motion and interaction craft for design engineers.",
    official: true,
    meshSrc: MESH.cool,
    defaultEnabled: false,
    category: "Motion",
    installsLabel: "152.1K Installs",
    author: "emilkowalski",
    sourceUrl: "https://github.com/emilkowalski/skills/tree/main/skills/emil-design-eng",
    longDescription:
      "Spring-based motion thinking from the author of Sonner and Vaul. Transitions get a physical feel instead of a linear fade, interactive elements answer immediately on hover and focus, and nothing animates unless the movement explains what changed.",
    features: [
      "Spring-like easing instead of linear fades",
      "Immediate hover and focus feedback on interactive elements",
      "Motion only where it explains a state change",
    ],
    bestFor: ["Overlays and sheets", "App shells", "Component-heavy UI"],
    tags: ["motion", "interaction", "design-engineering"],
  },
  {
    id: "design-motion-principles",
    name: "Design Motion Principles",
    overlayTitle: "<Design Motion Principles>",
    description: "kylezantos motion skill — frequency gate, duration bands, reduced-motion.",
    official: true,
    meshSrc: MESH.green,
    defaultEnabled: false,
    category: "Motion",
    installsLabel: "Curated",
    author: "kylezantos",
    sourceUrl: "https://github.com/kylezantos/design-motion-principles",
    longDescription:
      "Implies motion through structure. Because Stage's Hi-Fi output ships as JS-free HTML, this skill leans on clear enter/exit anchors, layered depth, and hover/focus affordances that read as interactive without any script.",
    features: [
      "Clear enter and exit anchors per section",
      "Layered depth instead of flat stacking",
      "Hover and focus affordances that read as interactive",
    ],
    bestFor: ["Marketing sites", "Product tours", "Feature pages"],
    tags: ["motion", "interaction", "depth"],
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
    packKind: "base",
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
    packKind: "primitives",
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
    packKind: "sections",
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
    packKind: "sections",
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
    packKind: "base",
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
    packKind: "base",
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
    packKind: "base",
    installsLabel: "5.2K Installs",
    promptHint:
      "Accessible form and notification patterns with consistent control heights and readable contrast.",
  },
  {
    id: "bklit-ui",
    name: "Bklit UI",
    description: "Design-engineered data visualization components for dashboards and reporting.",
    official: true,
    iconSrc: "/logos/component-packs/bklit.svg",
    defaultEnabled: false,
    category: "SaaS",
    packKind: "charts",
    installsLabel: "Not listed on skills.sh",
    promptHint:
      "Render metrics, trends, and reporting as real charts — area, bar, line, donut, sparkline — instead of faking graphs with divs.",
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

export function skillsInCategory(category: string): SkillCatalogItem[] {
  return DISCOVER_SKILL_CATALOG.filter((s) => s.category === category);
}

export function packsOfKind(kind: ComponentPackCatalogItem["packKind"]): ComponentPackCatalogItem[] {
  return COMPONENT_PACK_CATALOG.filter((p) => p.packKind === kind);
}

/** What Stage falls back to when a project has made no explicit choice. */
export function defaultProjectSelection(): { skillIds: string[]; componentPackIds: string[] } {
  return { skillIds: ["design-taste-frontend"], componentPackIds: ["shadcn-ui"] };
}
