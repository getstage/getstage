/**
 * !!! WIREFRAMES QUALITY INVENTORY — THE audit checklist for real React libraries !!!
 *
 * This file is the single source of "what we need" for the direction defined in
 * docs/WIREFRAMES_REAL_REACT_LIBRARIES.md: real React + Motion + Tailwind built from
 * the actual component libraries (registry-vendored), with live preview plus an
 * explicit static Figma capture — not static HTML everywhere by accident.
 *
 * This is NOT wired into the runtime yet. It is the audit table for skills,
 * libraries, real component inventories, gaps, and the work order.
 *
 * Research: Firecrawl CLI + registries + GitHub trees, 2026-08-10 / 2026-08-11.
 *
 * Keep ids in sync with:
 * - apps/stage-engine/src/wireframes/prompt.rs (CATALOG_SKILLS, COMPONENT_PACKS)
 * - packages/wireframe-renderer/manifests/libraries.json
 * - apps/user-application/src/lib/settings/skillsCatalog.ts
 *
 * Research sources (Firecrawl CLI, 2026-08-10):
 * - https://github.com/leonxlnx/taste-skill
 * - https://github.com/emilkowalski/skills
 * - https://github.com/nextlevelbuilder/ui-ux-pro-max-skill
 * - https://github.com/anthropics/skills
 * - https://github.com/pbakaus/impeccable
 * - https://github.com/kylezantos/design-motion-principles
 * - https://kokonutui.com/
 * - https://magicui.design/
 * - https://bklit.com/
 * - https://ui.shadcn.com/
 * - https://ui.aceternity.com/
 * - https://www.cult-ui.com/
 * - https://coss.com/ui
 * - https://astryx.atmeta.com/
 * - https://reactbits.dev/ (Firecrawl blocked; GitHub registry OK: DavidHDev/react-bits)
 */

// ---------------------------------------------------------------------------
// Status vocabulary
// ---------------------------------------------------------------------------

export type InventoryStatus =
  | "ok"
  | "stale"
  | "missing"
  | "thin"
  | "cosplay"
  | "candidate"
  | "blocked"
  | "todo";

// ---------------------------------------------------------------------------
// 1. Skills — keep motion skills; do not drop them here
// ---------------------------------------------------------------------------

export type SkillInventoryEntry = {
  id: string;
  name: string;
  upstreamUrl: string;
  stageSkillPath: string;
  /** Whether Stage currently injects this into Hi-Fi prompts when enabled. */
  injectedWhenEnabled: boolean;
  /** Upstream has a newer major shape Stage has not re-vendored. */
  status: InventoryStatus;
  /** What the skill is for (fact, not a product decision). */
  role: "taste" | "design" | "ux-db" | "craft" | "motion" | "frontend";
  /** Approx chars currently injected (digest + source where applicable). */
  approxPromptChars: number;
  notes: string;
  /** Concrete work still needed for this skill. */
  needs: readonly string[];
};

export const WIREFRAME_SKILLS: readonly SkillInventoryEntry[] = [
  {
    id: "design-taste-frontend",
    name: "Design Taste (taste-skill)",
    upstreamUrl: "https://github.com/Leonxlnx/taste-skill",
    stageSkillPath: "apps/stage-engine/skills/design-taste-frontend/",
    injectedWhenEnabled: true,
    status: "stale",
    role: "taste",
    approxPromptChars: 4_000,
    notes:
      "Stage digest still says HTML + one <style> block (v1 era). Upstream default is now v2 / Tailwind-native. Digest-only (source is ~87KB). Appended LAST so its bans win skill conflicts.",
    needs: [
      "Re-vendor Taste v2 (or current upstream SKILL.md)",
      "Rewrite Stage adapter for React/Tailwind Hi-Fi (tsx is the design)",
      "Remove or rewrite the 'not shipping React/Tailwind' line",
      "Decide whether to keep digest-only or include a tighter v2 slice",
    ],
  },
  {
    id: "frontend-design",
    name: "Frontend Design",
    upstreamUrl:
      "https://github.com/anthropics/skills/tree/main/skills/frontend-design",
    stageSkillPath: "apps/stage-engine/skills/frontend-design/",
    injectedWhenEnabled: true,
    status: "ok",
    role: "frontend",
    approxPromptChars: 8_000,
    notes: "Anthropic skill. Digest + SOURCE appended. General product UI craft.",
    needs: ["Re-read against React Hi-Fi path; confirm no HTML-era contradictions"],
  },
  {
    id: "ui-ux-pro-max",
    name: "UI UX Pro Max",
    upstreamUrl: "https://github.com/nextlevelbuilder/ui-ux-pro-max-skill",
    stageSkillPath: "apps/stage-engine/skills/ui-ux-pro-max/",
    injectedWhenEnabled: true,
    status: "stale",
    role: "ux-db",
    approxPromptChars: 23_000,
    notes:
      "Upstream is a searchable DB (scripts + CSVs: styles, palettes, fonts, UX rules, product types). Stage pastes prose/corpus into every screen prompt instead of querying.",
    needs: [
      "Vendor upstream CSV/data files into stage-engine",
      "Add engine-side lookup keyed by project_type (+ moodboard vibe)",
      "Inject only the matched slice (~2-3KB), not the full corpus",
      "Stop treating the skill as a wall of text",
    ],
  },
  {
    id: "impeccable",
    name: "Impeccable",
    upstreamUrl: "https://github.com/pbakaus/impeccable",
    stageSkillPath: "apps/stage-engine/skills/impeccable/",
    injectedWhenEnabled: true,
    status: "ok",
    role: "craft",
    approxPromptChars: 11_000,
    notes: "Craft/anti-pattern skill. Digest + SOURCE appended.",
    needs: ["Confirm React/Tailwind wording; keep as craft pass"],
  },
  {
    id: "emil-design-eng",
    name: "Emil Design Eng",
    upstreamUrl:
      "https://github.com/emilkowalski/skills/tree/main/skills/emil-design-eng",
    stageSkillPath: "apps/stage-engine/skills/emil-design-eng/",
    injectedWhenEnabled: true,
    status: "ok",
    role: "motion",
    approxPromptChars: 27_000,
    notes:
      "KEEP — product wants motion skills. Upstream repo also has animate, review-animations, improve-animations, find-animation-opportunities, animation-vocabulary, apple-design, pick-ui-library, prototype, ask-sonner. Stage only vendors emil-design-eng today. Renderer is static SSR today: JS-driven motion shows resting state only; CSS hover/keyframes survive.",
    needs: [
      "Adapt Stage wrapper so motion guidance maps to what the current renderer can show (CSS + hover) AND what a future live preview can show (JS)",
      "Decide which sibling Emil skills to vendor later (animate, review-animations, etc.) — not decided here",
      "Do NOT remove from catalog",
    ],
  },
  {
    id: "design-motion-principles",
    name: "Design Motion Principles",
    upstreamUrl: "https://github.com/kylezantos/design-motion-principles",
    stageSkillPath: "apps/stage-engine/skills/design-motion-principles/",
    injectedWhenEnabled: true,
    status: "ok",
    role: "motion",
    approxPromptChars: 7_000,
    notes:
      "KEEP — product wants motion skills. Upstream is principles + audit modes (incl. Framer Motion examples). Stage injects digest + SOURCE.",
    needs: [
      "Adapt Stage wrapper for static render + future live preview",
      "Do NOT remove from catalog",
    ],
  },
] as const;

export const MOTION_SKILL_IDS = [
  "emil-design-eng",
  "design-motion-principles",
] as const;

// ---------------------------------------------------------------------------
// 2. Renderer / pipeline facts (constraints, not decisions)
// ---------------------------------------------------------------------------

export const RENDERER_FACTS = {
  mode: "react-tsx-to-static-html",
  /** Opt out: STAGE_WIREFRAMES_REACT_RENDER=0 */
  envFlag: "STAGE_WIREFRAMES_REACT_RENDER",
  clientJavaScriptInPreview: true, // live preview runs the React+motion bundle (R1). Figma/thumbnail stay static.
  jsMotionRendersAs: "live-in-preview; resting-state-only for Figma/thumbnail",
  cssMotionSurvives: true,
  hoverFocusStatesSurvive: true,
  packCssInjectedInReactMode: false,
  tasteSkillAppendedLast: true,
  moodboardOutranksSkills: true,
  maxParallelScreenRuns: 6,
  promptPath: "apps/stage-engine/src/wireframes/prompt.rs",
  workflowPath: "apps/stage-engine/src/wireframes/workflow.rs",
  librariesManifestPath: "packages/wireframe-renderer/manifests/libraries.json",
  allowedImportModules: ["@stage/base", "@stage/sections", "@stage/charts", "react", "lucide-react", "motion", "motion/react"],
} as const;

// ---------------------------------------------------------------------------
// 3. Block kinds Stage already asks the model to use
// ---------------------------------------------------------------------------

export const ALLOWED_BLOCK_KINDS = [
  "header",
  "hero",
  "feature-grid",
  "testimonial",
  "pricing-table",
  "cta",
  "form",
  "logo-strip",
  "footer",
  "stat-strip",
  "faq",
  "media",
  "text",
  "list",
  "table",
  "navigation",
] as const;

export type BlockKind = (typeof ALLOWED_BLOCK_KINDS)[number];

// ---------------------------------------------------------------------------
// 4. Libraries — upstream vs what Stage actually exports today
// ---------------------------------------------------------------------------

export type LibrarySlot = "base" | "sections" | "charts" | "candidate";

export type LibraryInventoryEntry = {
  id: string;
  name: string;
  slot: LibrarySlot;
  upstreamUrl: string;
  /** Claimed / marketed component count from Firecrawl research (approx). */
  upstreamClaimedCount: number | null;
  /** Exact exports Stage can import today (from libraries.json). */
  stageExports: readonly string[];
  status: InventoryStatus;
  installHint: string;
  notes: string;
  needs: readonly string[];
};

/** Exact Stage export lists — keep 1:1 with libraries.json */
export const STAGE_LIBRARY_EXPORTS = {
  "shadcn-ui": [
    "Badge",
    "Button",
    "Card",
    "CardContent",
    "CardDescription",
    "CardFooter",
    "CardHeader",
    "CardTitle",
    "Input",
    "Label",
    "Select",
    "SelectContent",
    "SelectItem",
    "SelectTrigger",
    "SelectValue",
    "Table",
    "TableBody",
    "TableCell",
    "TableHead",
    "TableHeader",
    "TableRow",
    "Tabs",
    "TabsContent",
    "TabsList",
    "TabsTrigger",
    "Textarea",
  ],
  "kokonut-ui": [
    "Badge",
    "Button",
    "Card",
    "CardContent",
    "CardDescription",
    "CardFooter",
    "CardHeader",
    "CardTitle",
    "CommandButton",
    "GradientButton",
    "Input",
    "Label",
    "Table",
    "TableBody",
    "TableCell",
    "TableHead",
    "TableHeader",
    "TableRow",
    "Textarea",
    "CardFlip",
    "TweetCard",
    "LiquidGlassCard",
    "LiquidButton",
    "CarouselCards",
    "V0Button",
  ]
  "origin-ui": [
    "Badge",
    "Button",
    "Input",
    "Table",
    "TableBody",
    "TableCell",
    "TableHead",
    "TableHeader",
    "TableRow",
    "Textarea",
  ],
  mantine: [
    "Badge",
    "Button",
    "Card",
    "Grid",
    "Group",
    "Paper",
    "Select",
    "Stack",
    "Table",
    "Tabs",
    "Text",
    "Textarea",
    "TextInput",
    "Title",
  ],
  "magic-ui": [
    "BentoCard",
    "BentoGrid",
    "Marquee",
    "GridPattern",
    "DotPattern",
    "Ripple",
    "OrbitingCircles",
    "AnimatedShinyText",
    "AnimatedGradientText",
    "AuroraText",
    "ShineBorder",
    "BorderBeam",
    "ShimmerButton",
    "RainbowButton",
    "AvatarCircles",
    "Iphone",
    "Safari",
    "NeonGradientCard",
    "RetroGrid",
    "Meteors",
    "NoiseTexture",
    "PulsatingButton",
    "Android",
    "ProgressiveBlur",
    "HexagonPattern",
    "StripedPattern",
    "InteractiveGridPattern",
    "AnimatedCircularProgressBar",
    "RippleButton",
    "InteractiveHoverButton",
    "PixelImage",
    "Backlight",
    "MorphingText",
  ]
  "aceternity-ui": ["BentoGrid", "BentoGridItem"],
  "react-bits": [
    "StarBorder",
    "ElectricBorder",
    "GlareHover",
    "GlassIcons",
    "GlassSurface",
    "Folder",
    "GradualBlur",
  ],
  "bklit-ui": [
    "AreaChart",
    "BarChart",
    "ChartLegend",
    "DonutChart",
    "LineChart",
    "Sparkline",
  ],
} as const;

export const WIREFRAME_LIBRARIES: readonly LibraryInventoryEntry[] = [
  {
    id: "shadcn-ui",
    name: "shadcn/ui",
    slot: "base",
    upstreamUrl: "https://ui.shadcn.com/",
    upstreamClaimedCount: null,
    stageExports: STAGE_LIBRARY_EXPORTS["shadcn-ui"],
    status: "ok",
    installHint: "npx shadcn@latest add <name>",
    notes: "Default base. Solid primitives. Not the visual differentiator alone.",
    needs: ["Optional: expand form/dialog/sheet primitives if product screens need them"],
  },
  {
    id: "kokonut-ui",
    name: "Kokonut UI",
    slot: "base",
    upstreamUrl: "https://kokonutui.com/",
    upstreamClaimedCount: 100,
    stageExports: STAGE_LIBRARY_EXPORTS["kokonut-ui"],
    status: "thin",
    installHint: "npx shadcn@latest add @kokonutui/<name>",
    notes: "Upstream: 100+ components. Stage: 21 exports (mostly shadcn-shaped + CardFlip/TweetCard).",
    needs: [
      "Firecrawl / registry inventory of @kokonutui component names",
      "Shortlist by ALLOWED_BLOCK_KINDS",
      "Vendor static-safe sources only",
      "Update libraries.json exports + usage recipes",
    ],
  },
  {
    id: "origin-ui",
    name: "Origin UI",
    slot: "base",
    upstreamUrl: "https://github.com/shadcn/originui",
    upstreamClaimedCount: null,
    stageExports: STAGE_LIBRARY_EXPORTS["origin-ui"],
    status: "thin",
    installHint: "registry / GitHub source",
    notes: "Very thin Stage surface (10 exports).",
    needs: ["Decide keep vs deepen vs drop as a base option"],
  },
  {
    id: "mantine",
    name: "Mantine",
    slot: "base",
    upstreamUrl: "https://mantine.dev",
    upstreamClaimedCount: null,
    stageExports: STAGE_LIBRARY_EXPORTS.mantine,
    status: "ok",
    installHint: "npm @mantine/core",
    notes: "Works after React-instance fix. Heavy CSS historically; R2 offload landed.",
    needs: ["Confirm live quality vs shadcn/kokonut for product screens"],
  },
  {
    id: "magic-ui",
    name: "Magic UI",
    slot: "sections",
    upstreamUrl: "https://magicui.design/",
    upstreamClaimedCount: 150,
    stageExports: STAGE_LIBRARY_EXPORTS["magic-ui"],
    status: "thin",
    installHint: "npx shadcn@latest add @magicui/<name> (typical registry pattern)",
    notes: "Upstream: 150+ animated components. Stage: 17. Biggest sections gap.",
    needs: [
      "Inventory https://magicui.design/components",
      "Map to hero / feature-grid / logo-strip / cta / media",
      "Vendor static-safe only (motion resting state must be visible)",
      "Add composition recipes to libraries.json usage",
    ],
  },
  {
    id: "aceternity-ui",
    name: "Aceternity UI",
    slot: "sections",
    upstreamUrl: "https://ui.aceternity.com/",
    upstreamClaimedCount: 200,
    stageExports: STAGE_LIBRARY_EXPORTS["aceternity-ui"],
    status: "thin",
    installHint: "copy/paste / All-Access components",
    notes: "Upstream: 200+ components/blocks. Stage: only BentoGrid + BentoGridItem.",
    needs: [
      "Inventory free vs paid components",
      "Vendor a real landing-page set (hero, features, pricing, CTA)",
      "Static-safety filter",
    ],
  },
  {
    id: "bklit-ui",
    name: "Bklit UI",
    slot: "charts",
    upstreamUrl: "https://bklit.com/",
    upstreamClaimedCount: null,
    stageExports: STAGE_LIBRARY_EXPORTS["bklit-ui"],
    status: "cosplay",
    installHint: "https://bklit.com/docs/installation",
    notes:
      "Stage charts are deterministic SVG stand-ins. Real Bklit is use-client + visx ParentSize (empty under SSR).",
    needs: [
      "Decide: keep Stage SVG charts branded as Stage, or find SSR-safe subset of real Bklit",
      "Radar / radar / choropleth still missing (session audit)",
    ],
  },
] as const;

/** Libraries researched but NOT in the renderer yet. */
export const CANDIDATE_LIBRARIES: readonly LibraryInventoryEntry[] = [
  {
    id: "cult-ui",
    name: "cult-ui",
    slot: "candidate",
    upstreamUrl: "https://www.cult-ui.com/",
    upstreamClaimedCount: 78,
    stageExports: [],
    status: "candidate",
    installHint: "shadcn-style drop-in",
    notes: "78+ animated components on shadcn. Strong marketing/AI blocks.",
    needs: ["Inventory /docs/components", "Pick static-safe set", "Choose slot (sections vs base addons)"],
  },
  {
    id: "coss-ui",
    name: "coss/ui",
    slot: "candidate",
    upstreamUrl: "https://coss.com/ui",
    upstreamClaimedCount: null,
    stageExports: [],
    status: "candidate",
    installHint: "https://coss.com/ui/docs — Base UI based",
    notes: "Modern Base UI library, AI-oriented. Full primitive set on the site.",
    needs: ["Fit check vs Tailwind renderer", "Decide if base alternative or ignore"],
  },
  {
    id: "reactbits",
    name: "React Bits",
    slot: "candidate",
    upstreamUrl: "https://reactbits.dev/",
    upstreamClaimedCount: 165,
    stageExports: [],
    status: "candidate",
    installHint: "npx shadcn@latest add @react-bits/<Name>-TS-TW",
    notes:
      "Site blocks Firecrawl; GitHub registry works: DavidHDev/react-bits public/r/registry.json (660 items = 165 × 4 variants). Prefer TS-TW. License MIT+Commons Clause. ~124 need live runtime (gsap/motion/three/ogl); ~41 declared static-safe — fixture gate required.",
    needs: [
      "Add @stage slot or sections pack for React Bits once R1 live preview exists",
      "Vendor TS-TW sources via build-time script (same as Kokonut/Magic)",
      "License review (Commons Clause) before shipping",
    ],
  },
  {
    id: "astryx",
    name: "Astryx (Meta)",
    slot: "candidate",
    upstreamUrl: "https://astryx.atmeta.com/",
    upstreamClaimedCount: 160,
    stageExports: [],
    status: "blocked",
    installHint: "https://astryx.atmeta.com/docs/getting-started",
    notes:
      "React 19 + StyleX, not Tailwind. Does not fit current wireframe-renderer pipeline without a second styling stack.",
    needs: ["Treat as inspiration / theme reference unless StyleX support is a deliberate project"],
  },
] as const;

// ---------------------------------------------------------------------------
// 5. Block → component shopping list (targets, not yet vendored)
//    Fill `want` as we inventory. `have` = already in STAGE_LIBRARY_EXPORTS.
// ---------------------------------------------------------------------------

export type BlockComponentTarget = {
  blockKind: BlockKind;
  /** Components Stage already has that can cover this block. */
  have: readonly string[];
  /** Components / patterns we still need to vendor or recipe. Empty = unknown until inventory. */
  want: readonly string[];
  primaryLibraries: readonly string[];
};

export const BLOCK_COMPONENT_TARGETS: readonly BlockComponentTarget[] = [
  {
    blockKind: "header",
    have: ["Button", "Badge"],
    want: ["Nav with logo + links + CTA pattern"],
    primaryLibraries: ["shadcn-ui", "kokonut-ui", "magic-ui"],
  },
  {
    blockKind: "hero",
    have: [
      "AnimatedShinyText",
      "AnimatedGradientText",
      "AuroraText",
      "ShimmerButton",
      "RainbowButton",
      "GridPattern",
      "DotPattern",
      "Ripple",
      "Iphone",
      "Safari",
    ],
    want: [
      "Full hero sections from Magic/Aceternity/Kokonut (not just text effects)",
      "Background beams / spotlight / mesh variants that SSR visible",
    ],
    primaryLibraries: ["magic-ui", "aceternity-ui", "kokonut-ui"],
  },
  {
    blockKind: "feature-grid",
    have: ["BentoGrid", "BentoCard", "BentoGridItem", "Card", "CardFlip"],
    want: ["More bento / feature row variants", "Icon feature rows with aligned CTAs"],
    primaryLibraries: ["magic-ui", "aceternity-ui", "kokonut-ui"],
  },
  {
    blockKind: "testimonial",
    have: ["TweetCard", "AvatarCircles", "Marquee"],
    want: ["Quote / testimonial card variants", "Logo cloud testimonial rows"],
    primaryLibraries: ["kokonut-ui", "magic-ui", "cult-ui"],
  },
  {
    blockKind: "pricing-table",
    have: ["Card", "Button", "Badge"],
    want: ["Dedicated pricing tier component / recipe"],
    primaryLibraries: ["aceternity-ui", "kokonut-ui", "shadcn-ui"],
  },
  {
    blockKind: "cta",
    have: ["Button", "GradientButton", "ShimmerButton", "RainbowButton", "CommandButton"],
    want: ["Full CTA band / sticky CTA section recipes"],
    primaryLibraries: ["magic-ui", "kokonut-ui"],
  },
  {
    blockKind: "form",
    have: ["Input", "Label", "Textarea", "Select", "Button", "TextInput"],
    want: ["Auth / invite / multi-field form layouts", "Checkbox/Switch if needed"],
    primaryLibraries: ["shadcn-ui", "mantine", "kokonut-ui"],
  },
  {
    blockKind: "logo-strip",
    have: ["Marquee", "AvatarCircles"],
    want: ["Logo cloud component"],
    primaryLibraries: ["magic-ui", "aceternity-ui"],
  },
  {
    blockKind: "footer",
    have: [],
    want: ["Footer section pattern"],
    primaryLibraries: ["shadcn-ui", "aceternity-ui"],
  },
  {
    blockKind: "stat-strip",
    have: ["Sparkline", "AreaChart", "BarChart", "DonutChart", "LineChart", "ChartLegend"],
    want: ["Metric card / KPI strip components"],
    primaryLibraries: ["bklit-ui", "kokonut-ui"],
  },
  {
    blockKind: "faq",
    have: [],
    want: ["Accordion / FAQ section"],
    primaryLibraries: ["shadcn-ui", "coss-ui", "aceternity-ui"],
  },
  {
    blockKind: "media",
    have: ["Iphone", "Safari"],
    want: ["Browser/phone frames variants", "Image with chrome"],
    primaryLibraries: ["magic-ui", "cult-ui"],
  },
  {
    blockKind: "text",
    have: ["AnimatedShinyText", "AnimatedGradientText", "AuroraText"],
    want: [],
    primaryLibraries: ["magic-ui"],
  },
  {
    blockKind: "list",
    have: [],
    want: ["Checklist / feature list pattern"],
    primaryLibraries: ["shadcn-ui", "kokonut-ui"],
  },
  {
    blockKind: "table",
    have: [
      "Table",
      "TableBody",
      "TableCell",
      "TableHead",
      "TableHeader",
      "TableRow",
    ],
    want: [],
    primaryLibraries: ["shadcn-ui", "kokonut-ui", "mantine"],
  },
  {
    blockKind: "navigation",
    have: ["Tabs", "TabsList", "TabsTrigger", "TabsContent"],
    want: ["App shell nav / sidebar patterns for product screens"],
    primaryLibraries: ["shadcn-ui", "mantine", "kokonut-ui"],
  },
] as const;

// ---------------------------------------------------------------------------
// 6. Composition recipes to teach the model (prompt/manifest usage strings)
// ---------------------------------------------------------------------------

export type CompositionRecipe = {
  id: string;
  blockKind: BlockKind;
  /** Human-readable recipe for libraries.json `usage` or prompt. */
  recipe: string;
  requires: readonly string[];
};

export const COMPOSITION_RECIPES: readonly CompositionRecipe[] = [
  {
    id: "hero-shiny",
    blockKind: "hero",
    recipe:
      "Hero = relative section + GridPattern/DotPattern background + h1 with AnimatedShinyText on the key word + ShimmerButton or GradientButton CTA + optional Iphone/Safari product shot.",
    requires: ["GridPattern", "AnimatedShinyText", "ShimmerButton"],
  },
  {
    id: "features-bento",
    blockKind: "feature-grid",
    recipe:
      "Features = BentoGrid of BentoCards (name + description + optional Icon). Do not hand-write a 3-equal-card row when Bento exists.",
    requires: ["BentoGrid", "BentoCard"],
  },
  {
    id: "social-proof",
    blockKind: "testimonial",
    recipe:
      "Social proof = Marquee of TweetCards or AvatarCircles + short quote row. Prefer TweetCard over generic testimonial divs.",
    requires: ["Marquee", "TweetCard", "AvatarCircles"],
  },
  {
    id: "metrics",
    blockKind: "stat-strip",
    recipe:
      "Metrics = sized container (h-48) + AreaChart/BarChart/DonutChart from @stage/charts with text-* brand color on an ancestor. Never fake charts with divs.",
    requires: ["AreaChart", "BarChart", "DonutChart"],
  },
  {
    id: "device-shot",
    blockKind: "media",
    recipe:
      "Product media = Safari (imageSrc + url) or Iphone (src) framing a real Unsplash/product screenshot.",
    requires: ["Safari", "Iphone"],
  },
] as const;

// ---------------------------------------------------------------------------
// 7. Work items — the table of what is going wrong / still open
// ---------------------------------------------------------------------------

export type WorkItem = {
  id: string;
  title: string;
  status: InventoryStatus;
  priority: 1 | 2 | 3 | 4 | 5;
  area: "skill" | "lookup" | "library" | "brief" | "render" | "motion" | "ops";
  notes: string;
  /** Exact places that must change (file / symbol / line hint). */
  refs?: readonly string[];
};

/**
 * Audit checklist for the real-React-libraries direction.
 * New direction items come first (R1–R5). Legacy items kept for traceability.
 */
export const WORK_ITEMS: readonly WorkItem[] = [
  {
    id: "R1",
    title: "Live React preview/export path (stop rendering the final answer with renderToStaticMarkup)",
    status: "todo",
    priority: 1,
    area: "render",
    notes:
      "Today: TSX → one SSR pass → static HTML string (packages/wireframe-renderer/src/cli.ts renderScreen). That kills hover/click/Motion. Need a web preview that can run React + Motion, while keeping an explicit static capture for Figma.",
    refs: [
      "packages/wireframe-renderer/src/cli.ts: renderScreen, renderToStaticMarkup",
      "packages/wireframe-renderer/src/cli.ts: buildCss / themeCss (static Tailwind build)",
      "apps/stage-engine/src/wireframes/render.rs: apply_react_render, RENDER_MODE_REACT/FALLBACK",
    ],
  },
  {
    id: "R2",
    title: "Allow Motion/JS imports when the render path supports them",
    status: "todo",
    priority: 1,
    area: "motion",
    notes:
      "FREE_IMPORTS is only react + lucide-react; HIFI_REACT_RULES forbids JS motion. Keep the ban for Figma-static, allow motion/react for the live preview path.",
    refs: [
      "packages/wireframe-renderer/src/cli.ts: FREE_IMPORTS, validateTsx",
      "apps/stage-engine/src/wireframes/prompt.rs: HIFI_REACT_RULES motion block",
    ],
  },
  {
    id: "R3",
    title: "Real component acquisition: fetch/vendor from registries (Kokonut, Magic UI, Aceternity, cult-ui, coss/ui, reactbits, bklit)",
    status: "todo",
    priority: 1,
    area: "library",
    notes:
      "No fetch exists today: rewriteModuleBindings maps @stage/* → local @/libraries/*. Kokonut = 4 extra files, not the real 100+ library. Add a fetch/vendor pipeline (registry JSON / GitHub) with a static-safety filter for Figma.",
    refs: [
      "packages/wireframe-renderer/src/cli.ts: rewriteModuleBindings, LIBRARY_SLOTS",
      "packages/wireframe-renderer/manifests/libraries.json",
      "packages/wireframe-renderer/src/libraries/* (vendored subsets)",
    ],
  },
  {
    id: "R4",
    title: "Keep and wire motion skills (Emil, design-motion-principles) so they drive real output",
    status: "todo",
    priority: 2,
    area: "motion",
    notes:
      "They are currently prompt text whose JS assumptions die in static render. Once R1/R2 exist, these skills become the quality lever for interaction.",
    refs: [
      "apps/stage-engine/skills/emil-design-eng/",
      "apps/stage-engine/skills/design-motion-principles/",
      "apps/stage-engine/src/wireframes/prompt.rs: CATALOG_SKILLS, hifi_prompt_extras",
    ],
  },
  {
    id: "R5",
    title: "Explicit static capture for Figma (Figma is static-only)",
    status: "todo",
    priority: 2,
    area: "render",
    notes:
      "Figma does not run JS/hover/motion — it captures the resting frame. Keep a deliberate static render for export instead of accidentally making everything static.",
    refs: [
      "apps/figma-exporter/",
      "packages/wireframe-renderer/src/cli.ts: renderScreen (static path kept)",
    ],
  },
  {
    id: "W1",
    title: "Re-vendor Taste for React/Tailwind (kill HTML-era adapter)",
    status: "todo",
    priority: 1,
    area: "skill",
    notes: "Highest leverage. Current digest contradicts HIFI_REACT_RULES.",
  },
  {
    id: "W2",
    title: "Keep motion skills; adapt them to renderer reality + future live preview",
    status: "todo",
    priority: 1,
    area: "motion",
    notes:
      "emil-design-eng + design-motion-principles stay. Adapt wrappers; do not delete. Live React preview is the unlock for full JS motion.",
  },
  {
    id: "W3",
    title: "ui-ux-pro-max engine-side lookup (CSV query → small prompt slice)",
    status: "todo",
    priority: 1,
    area: "lookup",
    notes: "Must exist. Stop dumping ~23KB corpus per screen.",
  },
  {
    id: "W4",
    title: "Library depth: inventory → shortlist → vendor static-safe components",
    status: "todo",
    priority: 2,
    area: "library",
    notes:
      "Kokonut 100+→21, Magic 150+→17, Aceternity 200+→2. Use Firecrawl for indexes; pull source from registries/GitHub.",
  },
  {
    id: "W5",
    title: "Composition recipes in libraries.json usage strings",
    status: "todo",
    priority: 2,
    area: "library",
    notes: "Cheap win so the model actually composes what we already have.",
  },
  {
    id: "W6",
    title: "Phase 2 moodboard layout brief (patterns, not only tokens)",
    status: "todo",
    priority: 2,
    area: "brief",
    notes: "Quality plan Phase 2 — still Not started. Users asked 3×.",
  },
  {
    id: "W7",
    title: "Cross-screen consistency / refine (Phase 5)",
    status: "todo",
    priority: 3,
    area: "brief",
    notes: "Per-screen parallel runs never see sibling TSX.",
  },
  {
    id: "W8",
    title: "Live React preview (unlock real JS motion)",
    status: "todo",
    priority: 3,
    area: "render",
    notes: "Session audit item 19. Makes motion skills fully pay off.",
  },
  {
    id: "W9",
    title: "Mobile preview at 390px for app-design projects",
    status: "todo",
    priority: 4,
    area: "render",
    notes: "Contract exists; preview still not rendering at 390.",
  },
  {
    id: "W10",
    title: "Atmosphere sliders reach the prompt/renderer",
    status: "todo",
    priority: 4,
    area: "brief",
    notes: "Density/Variance/Motion still reach nothing.",
  },
] as const;

// ---------------------------------------------------------------------------
// 8. How to get the right components (ops recipe — tools, not decisions)
// ---------------------------------------------------------------------------

export const COMPONENT_ACQUISITION_PIPELINE = [
  {
    step: 1,
    name: "inventory",
    tool: "firecrawl",
    action:
      "Scrape each library /components or /docs index → names + categories into a list next to this file.",
  },
  {
    step: 2,
    name: "shortlist",
    tool: "manual",
    action:
      "Map names onto ALLOWED_BLOCK_KINDS + BLOCK_COMPONENT_TARGETS.want. Cap per library (e.g. 15–25).",
  },
  {
    step: 3,
    name: "vendor-source",
    tool: "registry-or-github",
    action:
      "Pull real source (shadcn registry JSON / GitHub). Do not scrape docs into components.",
  },
  {
    step: 4,
    name: "static-safety",
    tool: "renderer-fixture",
    action:
      "Reject components that SSR invisible (useEffect-gated, ParentSize-empty, motion initial hidden).",
  },
  {
    step: 5,
    name: "manifest",
    tool: "libraries.json",
    action: "Add exports + usage recipes; keep this inventory STAGE_LIBRARY_EXPORTS in sync.",
  },
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function stageExportCount(libraryId: keyof typeof STAGE_LIBRARY_EXPORTS): number {
  return STAGE_LIBRARY_EXPORTS[libraryId].length;
}

export function workItemsByPriority(): WorkItem[] {
  return [...WORK_ITEMS].sort((a, b) => a.priority - b.priority);
}

export function librariesNeedingDepth(): LibraryInventoryEntry[] {
  return WIREFRAME_LIBRARIES.filter((lib) =>
    ["thin", "cosplay", "stale"].includes(lib.status),
  );
}

// ===========================================================================
// ===========================================================================
//
//   NEW AUDIT — 2026-08-11 — REAL COMPONENT INVENTORY + WORK ORDER
//
//   The section above is the pre-2026-08-11 model. Everything below is the
//   real audit: what each upstream library actually ships, what Stage has,
//   what each component needs (static vs Motion), and the exact work order.
//
// ===========================================================================
// ===========================================================================

// ---------------------------------------------------------------------------
// A. Motion is the gate (measured 2026-08-11 from registries, not vibes)
// ---------------------------------------------------------------------------

export type MotionRequirement = "static-safe" | "needs-motion" | "mixed";

export const MOTION_GATE = {
  conclusion:
    "Almost every component worth having is Motion-dependent. Without a render path that supports motion/react, the real libraries collapse to their boring primitives.",
  kokonut: {
    sampled: [
      { name: "shape-hero", deps: ["motion"], note: "signature hero" },
      { name: "bento-grid", deps: ["lucide-react", "motion"], note: "features" },
      { name: "background-paths", deps: ["motion"], note: "hero background" },
      { name: "beams-background", deps: ["motion"], note: "hero background" },
      { name: "card-stack", deps: ["motion"], note: "expandable stack" },
      { name: "liquid-glass-card", deps: ["lucide-react"], regDeps: ["card", "button"], note: "SVG filter — static-safe" },
    ],
    roughSplit: "~5-8 static-safe of ~45; the rest assume motion/react",
  },
  magicUi: { roughSplit: "mostly Motion (text effects, beams, reveals, marquee)" },
  aceternity: { roughSplit: "heavily Motion (parallax heroes, glow effects, 3d, moving borders)" },
  cultUi: { roughSplit: "animated, shadcn-based" },
  reactbits: {
    roughSplit:
      "165 unique (TS-TW). Index deps: ~41 declared static-safe, ~124 need gsap/motion/three/ogl. Live preview required for most.",
  },
} as const;

// ---------------------------------------------------------------------------
// B. Real component inventory — per library, with block mapping + motion need
//    have = already exported by Stage (STAGE_LIBRARY_EXPORTS)
//    status: static-safe | needs-motion | candidate-blocked (site/repo blocked)
// ---------------------------------------------------------------------------

export type RealComponent = {
  name: string;
  /** Stage block kind it serves. */
  block: BlockKind;
  motion: MotionRequirement;
  /** Whether Stage already exports something with this name. */
  have: boolean;
  /** Firecrawl / registry evidence. */
  source: string;
};

// -- Kokonut UI (base) -------------------------------------------------------
// Real upstream tree: github.com/kokonut-labs/kokonutui components/kokonutui/*
// Stage today exports only: CommandButton, GradientButton, CardFlip, TweetCard.
export const KOKONUT_COMPONENTS: readonly RealComponent[] = [
  // Stage already has these (real, but only 4 beyond shadcn re-exports)
  { name: "card-flip", block: "feature-grid", motion: "static-safe", have: true, source: "registry r/card-flip.json" },
  { name: "tweet-card", block: "testimonial", motion: "static-safe", have: true, source: "registry" },
  { name: "command-button", block: "cta", motion: "static-safe", have: true, source: "registry" },
  { name: "gradient-button", block: "cta", motion: "static-safe", have: true, source: "registry" },

  // Missing — the ones that actually make Kokonut look like Kokonut
  { name: "liquid-glass-card", block: "feature-grid", motion: "static-safe", have: true, source: "registry r/liquid-glass-card.json — VENDORED 2026-08-11 as LiquidGlassCard + LiquidButton" },
  { name: "apple-activity-card", block: "stat-strip", motion: "needs-motion", have: false, source: "github tree" },
  { name: "shape-hero", block: "hero", motion: "needs-motion", have: false, source: "registry r/shape-hero.json deps=[motion]" },
  { name: "bento-grid", block: "feature-grid", motion: "needs-motion", have: false, source: "registry deps=[lucide,motion]" },
  { name: "background-paths", block: "hero", motion: "needs-motion", have: false, source: "registry deps=[motion]" },
  { name: "beams-background", block: "hero", motion: "needs-motion", have: false, source: "registry deps=[motion]" },
  { name: "card-stack", block: "feature-grid", motion: "needs-motion", have: false, source: "registry deps=[motion]" },
  { name: "spotlight-cards", block: "feature-grid", motion: "needs-motion", have: false, source: "github tree" },
  { name: "mouse-effect-card", block: "feature-grid", motion: "needs-motion", have: false, source: "github tree" },
  { name: "carousel-cards", block: "testimonial", motion: "needs-motion", have: false, source: "github tree" },
  { name: "morphic-navbar", block: "navigation", motion: "needs-motion", have: false, source: "github tree" },
  { name: "smooth-tab", block: "navigation", motion: "needs-motion", have: false, source: "github tree" },
  { name: "smooth-drawer", block: "navigation", motion: "needs-motion", have: false, source: "github tree" },
  { name: "toolbar", block: "navigation", motion: "static-safe", have: false, source: "github tree" },
  { name: "profile-dropdown", block: "navigation", motion: "needs-motion", have: false, source: "github tree" },
  { name: "action-search-bar", block: "form", motion: "needs-motion", have: false, source: "github tree" },
  { name: "ai-prompt", block: "form", motion: "needs-motion", have: false, source: "github tree" },
  { name: "ai-input-search", block: "form", motion: "needs-motion", have: false, source: "github tree" },
  { name: "file-upload", block: "form", motion: "needs-motion", have: false, source: "github tree" },
  { name: "hold-button", block: "cta", motion: "needs-motion", have: false, source: "github tree" },
  { name: "attract-button", block: "cta", motion: "needs-motion", have: false, source: "github tree" },
  { name: "particle-button", block: "cta", motion: "needs-motion", have: false, source: "github tree" },
  { name: "slide-text-button", block: "cta", motion: "needs-motion", have: false, source: "github tree" },
  { name: "social-button", block: "cta", motion: "needs-motion", have: false, source: "registry r/social-button.json deps=[motion] — NOT static-safe (corrected 2026-08-11)" },
  { name: "switch-button", block: "form", motion: "static-safe", have: false, source: "registry r/switch-button.json deps=[next-themes] — theme toggle, not vendorable/relevant (2026-08-11)" },
  { name: "v0-button", block: "cta", motion: "static-safe", have: false, source: "github tree" },
  { name: "type-writer", block: "hero", motion: "needs-motion", have: false, source: "github tree" },
  { name: "shimmer-text", block: "text", motion: "static-safe", have: false, source: "github tree" },
  { name: "dynamic-text", block: "text", motion: "needs-motion", have: false, source: "github tree" },
  { name: "glitch-text", block: "text", motion: "needs-motion", have: false, source: "github tree" },
  { name: "matrix-text", block: "text", motion: "needs-motion", have: false, source: "github tree" },
  { name: "swoosh-text", block: "text", motion: "needs-motion", have: false, source: "github tree" },
  { name: "sliced-text", block: "text", motion: "needs-motion", have: false, source: "github tree" },
  { name: "scroll-text", block: "text", motion: "needs-motion", have: false, source: "github tree" },
  { name: "flow-field", block: "media", motion: "needs-motion", have: false, source: "github tree" },
  { name: "currency-transfer", block: "stat-strip", motion: "needs-motion", have: false, source: "github tree" },
  { name: "team-selector", block: "feature-grid", motion: "needs-motion", have: false, source: "github tree" },
  { name: "avatar-picker", block: "form", motion: "needs-motion", have: false, source: "github tree" },
  { name: "ai-loading", block: "media", motion: "needs-motion", have: false, source: "github tree" },
  { name: "ai-text-loading", block: "text", motion: "needs-motion", have: false, source: "github tree" },
  { name: "ai-voice", block: "media", motion: "needs-motion", have: false, source: "github tree" },
  { name: "loader", block: "media", motion: "needs-motion", have: false, source: "github tree" },
];

// -- Magic UI (sections) ------------------------------------------------------
// Index: magicui.design/components (Firecrawl 2026-08-11).
// Stage today exports 17; upstream ~80-100+ docs entries.
export const MAGIC_UI_COMPONENTS: readonly RealComponent[] = [
  // Stage already has these
  { name: "BentoGrid", block: "feature-grid", motion: "static-safe", have: true, source: "libraries.json" },
  { name: "BentoCard", block: "feature-grid", motion: "static-safe", have: true, source: "libraries.json" },
  { name: "Marquee", block: "logo-strip", motion: "static-safe", have: true, source: "libraries.json" },
  { name: "GridPattern", block: "hero", motion: "static-safe", have: true, source: "libraries.json" },
  { name: "DotPattern", block: "hero", motion: "static-safe", have: true, source: "libraries.json" },
  { name: "Ripple", block: "hero", motion: "static-safe", have: true, source: "libraries.json" },
  { name: "OrbitingCircles", block: "hero", motion: "static-safe", have: true, source: "libraries.json" },
  { name: "AnimatedShinyText", block: "text", motion: "static-safe", have: true, source: "libraries.json" },
  { name: "AnimatedGradientText", block: "text", motion: "static-safe", have: true, source: "libraries.json" },
  { name: "AuroraText", block: "text", motion: "static-safe", have: true, source: "libraries.json" },
  { name: "ShineBorder", block: "feature-grid", motion: "static-safe", have: true, source: "libraries.json" },
  { name: "BorderBeam", block: "feature-grid", motion: "static-safe", have: true, source: "libraries.json" },
  { name: "ShimmerButton", block: "cta", motion: "static-safe", have: true, source: "libraries.json" },
  { name: "RainbowButton", block: "cta", motion: "static-safe", have: true, source: "libraries.json" },
  { name: "AvatarCircles", block: "testimonial", motion: "static-safe", have: true, source: "libraries.json" },
  { name: "Iphone", block: "media", motion: "static-safe", have: true, source: "libraries.json" },
  { name: "Safari", block: "media", motion: "static-safe", have: true, source: "libraries.json" },

  // Missing — real sections/heroes/CTAs
  { name: "HeroVideoDialog", block: "hero", motion: "needs-motion", have: false, source: "magicui.design/components" },
  { name: "AnimatedList", block: "list", motion: "needs-motion", have: false, source: "magicui.design/components" },
  { name: "Terminal", block: "media", motion: "needs-motion", have: false, source: "magicui.design/components" },
  { name: "Globe", block: "media", motion: "needs-motion", have: false, source: "magicui.design/components" },
  { name: "TweetCard", block: "testimonial", motion: "needs-motion", have: false, source: "magicui.design/components" },
  { name: "IconCloud", block: "logo-strip", motion: "needs-motion", have: false, source: "magicui.design/components" },
  { name: "Lens", block: "media", motion: "needs-motion", have: false, source: "magicui.design/components" },
  { name: "Pointer", block: "media", motion: "needs-motion", have: false, source: "magicui.design/components" },
  { name: "ProgressiveBlur", block: "media", motion: "needs-motion", have: false, source: "magicui.design/components" },
  { name: "AnimatedBeam", block: "feature-grid", motion: "needs-motion", have: false, source: "magicui.design/components" },
  { name: "MagicCard", block: "feature-grid", motion: "needs-motion", have: false, source: "magicui.design/components" },
  { name: "Meteors", block: "hero", motion: "static-safe", have: true, source: "registry deps=[] (CSS keyframes) — VENDORED 2026-08-11" },
  { name: "Particles", block: "hero", motion: "needs-motion", have: false, source: "magicui.design/components" },
  { name: "BlurFade", block: "text", motion: "needs-motion", have: false, source: "magicui.design/components" },
  { name: "TextAnimate", block: "text", motion: "needs-motion", have: false, source: "magicui.design/components" },
  { name: "TypingAnimation", block: "text", motion: "needs-motion", have: false, source: "magicui.design/components" },
  { name: "LineShadowText", block: "text", motion: "needs-motion", have: false, source: "magicui.design/components" },
  { name: "VideoText", block: "text", motion: "needs-motion", have: false, source: "magicui.design/components" },
  { name: "NumberTicker", block: "stat-strip", motion: "needs-motion", have: false, source: "magicui.design/components" },
  { name: "TextReveal", block: "text", motion: "needs-motion", have: false, source: "magicui.design/components" },
  { name: "HyperText", block: "text", motion: "needs-motion", have: false, source: "magicui.design/components" },
  { name: "WordRotate", block: "text", motion: "needs-motion", have: false, source: "magicui.design/components" },
  { name: "ScrollBasedVelocity", block: "text", motion: "needs-motion", have: false, source: "magicui.design/components" },
  { name: "SparklesText", block: "text", motion: "needs-motion", have: false, source: "magicui.design/components" },
  { name: "MorphingText", block: "text", motion: "needs-motion", have: false, source: "magicui.design/components" },
  { name: "Android", block: "media", motion: "static-safe", have: false, source: "magicui.design/components" },
  { name: "RippleButton", block: "cta", motion: "needs-motion", have: false, source: "magicui.design/components" },
  { name: "FlickeringGrid", block: "hero", motion: "needs-motion", have: false, source: "magicui.design/components" },
  { name: "AnimatedGridPattern", block: "hero", motion: "needs-motion", have: false, source: "magicui.design/components" },
  { name: "RetroGrid", block: "hero", motion: "static-safe", have: true, source: "registry — VENDORED 2026-08-11" },
  { name: "InteractiveGridPattern", block: "hero", motion: "needs-motion", have: false, source: "magicui.design/components" },
  { name: "LightRays", block: "hero", motion: "needs-motion", have: false, source: "magicui.design/components" },
  { name: "NoiseTexture", block: "hero", motion: "static-safe", have: true, source: "registry — VENDORED 2026-08-11" },
  { name: "FileTree", block: "navigation", motion: "needs-motion", have: false, source: "magicui.design/components" },
  { name: "CodeComparison", block: "media", motion: "needs-motion", have: false, source: "magicui.design/components" },
  { name: "ScrollProgress", block: "navigation", motion: "needs-motion", have: false, source: "magicui.design/components" },
  { name: "NeonGradientCard", block: "feature-grid", motion: "static-safe", have: true, source: "registry — VENDORED 2026-08-11" },
  { name: "PulsatingButton", block: "cta", motion: "static-safe", have: true, source: "registry — VENDORED 2026-08-11" },
  { name: "InteractiveHoverButton", block: "cta", motion: "needs-motion", have: false, source: "magicui.design/components" },
  { name: "AnimatedCircularProgressBar", block: "stat-strip", motion: "needs-motion", have: false, source: "magicui.design/components" },
];

// -- Aceternity UI (sections) -------------------------------------------------
// Index: ui.aceternity.com/components (Firecrawl 2026-08-11).
// Stage today exports only BentoGrid + BentoGridItem (2 of 200+).
export const ACETERNITY_COMPONENTS: readonly RealComponent[] = [
  // Stage has (thin)
  { name: "BentoGrid", block: "feature-grid", motion: "static-safe", have: true, source: "libraries.json" },
  { name: "BentoGridItem", block: "feature-grid", motion: "static-safe", have: true, source: "libraries.json" },

  // Missing — landing page workhorses
  { name: "hero-sections-free", block: "hero", motion: "needs-motion", have: false, source: "ui.aceternity.com/components" },
  { name: "feature-sections-free", block: "feature-grid", motion: "needs-motion", have: false, source: "ui.aceternity.com/components" },
  { name: "cards-free", block: "feature-grid", motion: "needs-motion", have: false, source: "ui.aceternity.com/components" },
  { name: "animated-testimonials", block: "testimonial", motion: "needs-motion", have: false, source: "ui.aceternity.com/components" },
  { name: "3d-marquee", block: "testimonial", motion: "needs-motion", have: false, source: "ui.aceternity.com/components" },
  { name: "infinite-moving-cards", block: "testimonial", motion: "needs-motion", have: false, source: "ui.aceternity.com/components" },
  { name: "card-stack", block: "testimonial", motion: "needs-motion", have: false, source: "ui.aceternity.com/components" },
  { name: "card-spotlight", block: "feature-grid", motion: "needs-motion", have: false, source: "ui.aceternity.com/components" },
  { name: "3d-card-effect", block: "feature-grid", motion: "needs-motion", have: false, source: "ui.aceternity.com/components" },
  { name: "expandable-card", block: "feature-grid", motion: "needs-motion", have: false, source: "ui.aceternity.com/components" },
  { name: "focus-cards", block: "feature-grid", motion: "needs-motion", have: false, source: "ui.aceternity.com/components" },
  { name: "wobble-card", block: "feature-grid", motion: "needs-motion", have: false, source: "ui.aceternity.com/components" },
  { name: "glare-card", block: "feature-grid", motion: "needs-motion", have: false, source: "ui.aceternity.com/components" },
  { name: "glowing-effect", block: "feature-grid", motion: "needs-motion", have: false, source: "ui.aceternity.com/components" },
  { name: "background-beams", block: "hero", motion: "needs-motion", have: false, source: "ui.aceternity.com/components" },
  { name: "background-lines", block: "hero", motion: "needs-motion", have: false, source: "ui.aceternity.com/components" },
  { name: "aurora-background", block: "hero", motion: "needs-motion", have: false, source: "ui.aceternity.com/components" },
  { name: "background-gradient-animation", block: "hero", motion: "needs-motion", have: false, source: "ui.aceternity.com/components" },
  { name: "hero-highlight", block: "hero", motion: "needs-motion", have: false, source: "ui.aceternity.com/components" },
  { name: "hero-parallax", block: "hero", motion: "needs-motion", have: false, source: "ui.aceternity.com/components" },
  { name: "parallax-hero-images", block: "hero", motion: "needs-motion", have: false, source: "ui.aceternity.com/components" },
  { name: "spotlight", block: "hero", motion: "static-safe", have: false, source: "ui.aceternity.com/components" },
  { name: "sparkles", block: "hero", motion: "needs-motion", have: false, source: "ui.aceternity.com/components" },
  { name: "meteors", block: "hero", motion: "needs-motion", have: false, source: "ui.aceternity.com/components" },
  { name: "vortex", block: "cta", motion: "needs-motion", have: false, source: "ui.aceternity.com/components" },
  { name: "wavy-background", block: "cta", motion: "needs-motion", have: false, source: "ui.aceternity.com/components" },
  { name: "hover-border-gradient", block: "cta", motion: "needs-motion", have: false, source: "ui.aceternity.com/components" },
  { name: "moving-border", block: "cta", motion: "needs-motion", have: false, source: "ui.aceternity.com/components" },
  { name: "magnetic-button", block: "cta", motion: "needs-motion", have: false, source: "ui.aceternity.com/components" },
  { name: "stateful-button", block: "cta", motion: "needs-motion", have: false, source: "ui.aceternity.com/components" },
  { name: "lamp-effect", block: "hero", motion: "needs-motion", have: false, source: "ui.aceternity.com/components" },
  { name: "signup-form", block: "form", motion: "needs-motion", have: false, source: "ui.aceternity.com/components" },
  { name: "placeholders-and-vanish-input", block: "form", motion: "needs-motion", have: false, source: "ui.aceternity.com/components" },
  { name: "gooey-input", block: "form", motion: "needs-motion", have: false, source: "ui.aceternity.com/components" },
  { name: "file-upload", block: "form", motion: "needs-motion", have: false, source: "ui.aceternity.com/components" },
  { name: "floating-dock", block: "navigation", motion: "needs-motion", have: false, source: "ui.aceternity.com/components" },
  { name: "resizable-navbar", block: "navigation", motion: "needs-motion", have: false, source: "ui.aceternity.com/components" },
  { name: "sidebar", block: "navigation", motion: "needs-motion", have: false, source: "ui.aceternity.com/components" },
  { name: "tabs", block: "navigation", motion: "needs-motion", have: false, source: "ui.aceternity.com/components" },
  { name: "animated-modal", block: "navigation", motion: "needs-motion", have: false, source: "ui.aceternity.com/components" },
  { name: "animated-tooltip", block: "navigation", motion: "needs-motion", have: false, source: "ui.aceternity.com/components" },
  { name: "macbook-scroll", block: "media", motion: "needs-motion", have: false, source: "ui.aceternity.com/components" },
  { name: "container-scroll-animation", block: "media", motion: "needs-motion", have: false, source: "ui.aceternity.com/components" },
  { name: "compare", block: "media", motion: "needs-motion", have: false, source: "ui.aceternity.com/components" },
  { name: "link-preview", block: "media", motion: "needs-motion", have: false, source: "ui.aceternity.com/components" },
  { name: "typewriter-effect", block: "text", motion: "needs-motion", have: false, source: "ui.aceternity.com/components" },
  { name: "text-generate-effect", block: "text", motion: "needs-motion", have: false, source: "ui.aceternity.com/components" },
  { name: "flip-words", block: "text", motion: "needs-motion", have: false, source: "ui.aceternity.com/components" },
  { name: "text-hover-effect", block: "text", motion: "needs-motion", have: false, source: "ui.aceternity.com/components" },
  { name: "colourful-text", block: "text", motion: "needs-motion", have: false, source: "ui.aceternity.com/components" },
  { name: "sticky-scroll-reveal", block: "feature-grid", motion: "needs-motion", have: false, source: "ui.aceternity.com/components" },
  { name: "layout-grid", block: "feature-grid", motion: "needs-motion", have: false, source: "ui.aceternity.com/components" },
  { name: "parallax-scroll", block: "feature-grid", motion: "needs-motion", have: false, source: "ui.aceternity.com/components" },
  { name: "apple-cards-carousel", block: "feature-grid", motion: "needs-motion", have: false, source: "ui.aceternity.com/components" },
];

// -- cult-ui (candidate sections) ---------------------------------------------
// Note: www.cult-ui.com/docs/components 404s; real docs live at /docs/components/<slug>.
// Known strong sets from the index: marketing/AI blocks + animated components.
export const CULT_UI_COMPONENTS: readonly RealComponent[] = [
  { name: "shift-card", block: "feature-grid", motion: "needs-motion", have: false, source: "cult-ui.com" },
  { name: "screen-capture", block: "media", motion: "needs-motion", have: false, source: "cult-ui.com" },
  { name: "analytics-chart", block: "stat-strip", motion: "needs-motion", have: false, source: "cult-ui.com/pro" },
  { name: "feature-sticky-section", block: "feature-grid", motion: "needs-motion", have: false, source: "cult-ui.com/pro" },
  { name: "fluted-glass", block: "feature-grid", motion: "static-safe", have: false, source: "cult-ui.com/pro" },
  { name: "circuit-board", block: "media", motion: "static-safe", have: false, source: "cult-ui.com/pro" },
  { name: "collab-avatar", block: "testimonial", motion: "needs-motion", have: false, source: "cult-ui.com/pro" },
  { name: "copy-button", block: "cta", motion: "static-safe", have: false, source: "cult-ui.com/pro" },
];

// -- bklit (charts) ------------------------------------------------------------
// Docs minimal (index scrape was mostly counters). Stage has 5 basic SVG charts.
export const BKLIT_COMPONENTS: readonly RealComponent[] = [
  { name: "AreaChart", block: "stat-strip", motion: "static-safe", have: true, source: "libraries.json (Stage SVG stand-in)" },
  { name: "BarChart", block: "stat-strip", motion: "static-safe", have: true, source: "libraries.json (Stage SVG stand-in)" },
  { name: "LineChart", block: "stat-strip", motion: "static-safe", have: true, source: "libraries.json (Stage SVG stand-in)" },
  { name: "DonutChart", block: "stat-strip", motion: "static-safe", have: true, source: "libraries.json (Stage SVG stand-in)" },
  { name: "Sparkline", block: "stat-strip", motion: "static-safe", have: true, source: "libraries.json (Stage SVG stand-in)" },
  { name: "ChartLegend", block: "stat-strip", motion: "static-safe", have: true, source: "libraries.json (Stage SVG stand-in)" },
  { name: "RadarChart", block: "stat-strip", motion: "needs-motion", have: false, source: "audit (missing)" },
  { name: "Gauge", block: "stat-strip", motion: "needs-motion", have: false, source: "audit (missing)" },
  { name: "Choropleth", block: "stat-strip", motion: "needs-motion", have: false, source: "audit (missing)" },
];

// -- React Bits (candidate) -----------------------------------------------------
// Source: https://github.com/DavidHDev/react-bits/blob/main/public/r/registry.json
// Firecrawl of reactbits.dev fails (SPA/bot block). GitHub registry works.
// Prefer TS-TW variants. License: MIT + Commons Clause — check before shipping.
// Counts (2026-08-11): 660 registry items = 165 unique × 4 variants (JS/TS × CSS/TW).
export const REACTBITS_REGISTRY = {
  indexUrl: "https://raw.githubusercontent.com/DavidHDev/react-bits/main/public/r/registry.json",
  homepage: "https://reactbits.dev/",
  github: "https://github.com/DavidHDev/react-bits",
  installExample: "npx shadcn@latest add @react-bits/BlurText-TS-TW",
  uniqueComponentCount: 165,
  registryItemCount: 660,
  preferredVariant: "TS-TW",
} as const;

export const REACTBITS_COMPONENTS: readonly RealComponent[] = [
  { name: "ASCIIText", block: "text", motion: "needs-motion", have: false, source: "registry ASCIIText-TS-TW deps=[three@^0.180.0]" },
  { name: "AccordionGallery", block: "feature-grid", motion: "needs-motion", have: false, source: "registry AccordionGallery-TS-TW deps=[gsap@^3.13.0]" },
  { name: "AcidSquares", block: "media", motion: "needs-motion", have: false, source: "registry AcidSquares-TS-TW deps=[ogl@^1.0.11]" },
  { name: "AnimatedContent", block: "media", motion: "needs-motion", have: false, source: "registry AnimatedContent-TS-TW deps=[gsap@^3.13.0]" },
  { name: "AnimatedList", block: "media", motion: "needs-motion", have: false, source: "registry AnimatedList-TS-TW deps=[motion@^12.23.12]" },
  { name: "Antigravity", block: "media", motion: "needs-motion", have: false, source: "registry Antigravity-TS-TW deps=[@react-three/fiber@^9.3.0,three@^0.180.0]" },
  { name: "Aurora", block: "hero", motion: "needs-motion", have: false, source: "registry Aurora-TS-TW deps=[ogl@^1.0.11]" },
  { name: "Balatro", block: "media", motion: "needs-motion", have: false, source: "registry Balatro-TS-TW deps=[ogl@^1.0.11]" },
  { name: "Ballpit", block: "media", motion: "needs-motion", have: false, source: "registry Ballpit-TS-TW deps=[gsap@^3.13.0,three@^0.180.0]" },
  { name: "Beams", block: "hero", motion: "needs-motion", have: false, source: "registry Beams-TS-TW deps=[three@^0.180.0,@react-three/fiber@^9.3.0,@react-three/drei@^10.7.4]" },
  { name: "BlobCursor", block: "media", motion: "needs-motion", have: false, source: "registry BlobCursor-TS-TW deps=[gsap@^3.13.0]" },
  { name: "BlurText", block: "text", motion: "needs-motion", have: false, source: "registry BlurText-TS-TW deps=[motion@^12.23.12]" },
  { name: "BorderGlow", block: "media", motion: "static-safe", have: false, source: "registry BorderGlow-TS-TW deps=[none]" },
  { name: "BounceCards", block: "feature-grid", motion: "needs-motion", have: false, source: "registry BounceCards-TS-TW deps=[gsap@^3.13.0]" },
  { name: "BubbleMenu", block: "navigation", motion: "needs-motion", have: false, source: "registry BubbleMenu-TS-TW deps=[gsap@^3.13.0]" },
  { name: "CardNav", block: "navigation", motion: "needs-motion", have: false, source: "registry CardNav-TS-TW deps=[gsap@^3.13.0,react-icons@^5.5.0]" },
  { name: "CardSwap", block: "feature-grid", motion: "needs-motion", have: false, source: "registry CardSwap-TS-TW deps=[gsap@^3.13.0]" },
  { name: "Carousel", block: "feature-grid", motion: "needs-motion", have: false, source: "registry Carousel-TS-TW deps=[motion@^12.23.12,react-icons@^5.5.0]" },
  { name: "ChromaGrid", block: "feature-grid", motion: "needs-motion", have: false, source: "registry ChromaGrid-TS-TW deps=[gsap@^3.13.0]" },
  { name: "CircularGallery", block: "feature-grid", motion: "needs-motion", have: false, source: "registry CircularGallery-TS-TW deps=[ogl@^1.0.11]" },
  { name: "CircularText", block: "text", motion: "needs-motion", have: false, source: "registry CircularText-TS-TW deps=[motion@^12.23.12]" },
  { name: "ClickSpark", block: "media", motion: "static-safe", have: false, source: "registry ClickSpark-TS-TW deps=[none]" },
  { name: "ColorBends", block: "media", motion: "needs-motion", have: false, source: "registry ColorBends-TS-TW deps=[three@^0.180.0]" },
  { name: "CountUp", block: "text", motion: "needs-motion", have: false, source: "registry CountUp-TS-TW deps=[motion@^12.23.12]" },
  { name: "Counter", block: "text", motion: "needs-motion", have: false, source: "registry Counter-TS-TW deps=[motion@^12.23.12]" },
  { name: "Crosshair", block: "media", motion: "needs-motion", have: false, source: "registry Crosshair-TS-TW deps=[gsap@^3.13.0]" },
  { name: "Cubes", block: "media", motion: "needs-motion", have: false, source: "registry Cubes-TS-TW deps=[gsap@^3.13.0]" },
  { name: "CursorGrid", block: "feature-grid", motion: "static-safe", have: false, source: "registry CursorGrid-TS-TW deps=[none]" },
  { name: "CurvedInput", block: "form", motion: "static-safe", have: false, source: "registry CurvedInput-TS-TW deps=[none]" },
  { name: "CurvedLoop", block: "logo-strip", motion: "static-safe", have: false, source: "registry CurvedLoop-TS-TW deps=[none]" },
  { name: "DarkVeil", block: "hero", motion: "needs-motion", have: false, source: "registry DarkVeil-TS-TW deps=[ogl@^1.0.11]" },
  { name: "DecayCard", block: "feature-grid", motion: "needs-motion", have: false, source: "registry DecayCard-TS-TW deps=[gsap@^3.13.0]" },
  { name: "DecryptedText", block: "text", motion: "needs-motion", have: false, source: "registry DecryptedText-TS-TW deps=[motion@^12.23.12]" },
  { name: "DepthCarousel", block: "text", motion: "needs-motion", have: false, source: "registry DepthCarousel-TS-TW deps=[gsap@^3.13.0]" },
  { name: "DepthText", block: "text", motion: "static-safe", have: false, source: "registry DepthText-TS-TW deps=[none]" },
  { name: "Dither", block: "media", motion: "needs-motion", have: false, source: "registry Dither-TS-TW deps=[@react-three/fiber@^9.3.0,@react-three/postprocessing@^3.0.4,postprocessing@^6.36.0,three@^0.180.0]" },
  { name: "Dock", block: "navigation", motion: "needs-motion", have: false, source: "registry Dock-TS-TW deps=[motion@^12.23.12]" },
  { name: "DomeGallery", block: "feature-grid", motion: "needs-motion", have: false, source: "registry DomeGallery-TS-TW deps=[@use-gesture/react@^10.2.27]" },
  { name: "DotField", block: "media", motion: "static-safe", have: false, source: "registry DotField-TS-TW deps=[none]" },
  { name: "DotGrid", block: "feature-grid", motion: "needs-motion", have: false, source: "registry DotGrid-TS-TW deps=[gsap@^3.13.0]" },
  { name: "DriftWall", block: "media", motion: "static-safe", have: false, source: "registry DriftWall-TS-TW deps=[none]" },
  { name: "EchoText", block: "text", motion: "static-safe", have: false, source: "registry EchoText-TS-TW deps=[none]" },
  { name: "ElasticMesh", block: "media", motion: "needs-motion", have: false, source: "registry ElasticMesh-TS-TW deps=[ogl@^1.0.11]" },
  { name: "ElasticSlider", block: "media", motion: "needs-motion", have: false, source: "registry ElasticSlider-TS-TW deps=[motion@^12.23.12]" },
  { name: "ElectricBorder", block: "media", motion: "static-safe", have: false, source: "registry ElectricBorder-TS-TW deps=[none]" },
  { name: "EvilEye", block: "media", motion: "needs-motion", have: false, source: "registry EvilEye-TS-TW deps=[ogl@^1.0.11]" },
  { name: "FadeContent", block: "media", motion: "needs-motion", have: false, source: "registry FadeContent-TS-TW deps=[gsap@^3.13.0]" },
  { name: "FallingText", block: "text", motion: "needs-motion", have: false, source: "registry FallingText-TS-TW deps=[matter-js@^0.20.0]" },
  { name: "FaultyTerminal", block: "hero", motion: "needs-motion", have: false, source: "registry FaultyTerminal-TS-TW deps=[ogl@^1.0.11]" },
  { name: "Ferrofluid", block: "media", motion: "needs-motion", have: false, source: "registry Ferrofluid-TS-TW deps=[ogl@^1.0.11]" },
  { name: "FloatingLines", block: "media", motion: "needs-motion", have: false, source: "registry FloatingLines-TS-TW deps=[three@^0.180.0]" },
  { name: "FlowingMenu", block: "navigation", motion: "needs-motion", have: false, source: "registry FlowingMenu-TS-TW deps=[gsap@^3.13.0]" },
  { name: "FluidGlass", block: "media", motion: "needs-motion", have: false, source: "registry FluidGlass-TS-TW deps=[three@^0.180.0,@react-three/fiber@^9.3.0,@react-three/drei@^10.7.4,maath@^0.10.8]" },
  { name: "FlyingPosters", block: "media", motion: "needs-motion", have: false, source: "registry FlyingPosters-TS-TW deps=[ogl@^1.0.11]" },
  { name: "FoldText", block: "text", motion: "needs-motion", have: false, source: "registry FoldText-TS-TW deps=[gsap@^3.13.0]" },
  { name: "Folder", block: "feature-grid", motion: "static-safe", have: false, source: "registry Folder-TS-TW deps=[none]" },
  { name: "FuzzyText", block: "text", motion: "static-safe", have: false, source: "registry FuzzyText-TS-TW deps=[none]" },
  { name: "Galaxy", block: "hero", motion: "needs-motion", have: false, source: "registry Galaxy-TS-TW deps=[ogl@^1.0.11]" },
  { name: "GhostCursor", block: "media", motion: "needs-motion", have: false, source: "registry GhostCursor-TS-TW deps=[three@^0.180.0]" },
  { name: "GlareHover", block: "media", motion: "static-safe", have: false, source: "registry GlareHover-TS-TW deps=[none]" },
  { name: "GlassIcons", block: "media", motion: "static-safe", have: false, source: "registry GlassIcons-TS-TW deps=[none]" },
  { name: "GlassSurface", block: "media", motion: "static-safe", have: false, source: "registry GlassSurface-TS-TW deps=[none]" },
  { name: "GlitchText", block: "text", motion: "static-safe", have: false, source: "registry GlitchText-TS-TW deps=[none]" },
  { name: "GooeyNav", block: "navigation", motion: "static-safe", have: false, source: "registry GooeyNav-TS-TW deps=[none]" },
  { name: "GradientBlinds", block: "hero", motion: "needs-motion", have: false, source: "registry GradientBlinds-TS-TW deps=[ogl@^1.0.11]" },
  { name: "GradientText", block: "text", motion: "needs-motion", have: false, source: "registry GradientText-TS-TW deps=[motion@^12.23.12]" },
  { name: "GradientWaves", block: "hero", motion: "needs-motion", have: false, source: "registry GradientWaves-TS-TW deps=[ogl@^1.0.11]" },
  { name: "GradualBlur", block: "media", motion: "static-safe", have: false, source: "registry GradualBlur-TS-TW deps=[none]" },
  { name: "Grainient", block: "hero", motion: "needs-motion", have: false, source: "registry Grainient-TS-TW deps=[ogl@^1.0.11]" },
  { name: "GridDistortion", block: "feature-grid", motion: "needs-motion", have: false, source: "registry GridDistortion-TS-TW deps=[three@^0.180.0]" },
  { name: "GridMotion", block: "feature-grid", motion: "needs-motion", have: false, source: "registry GridMotion-TS-TW deps=[gsap@^3.13.0]" },
  { name: "GridScan", block: "feature-grid", motion: "needs-motion", have: false, source: "registry GridScan-TS-TW deps=[face-api.js@^0.22.2,postprocessing@^6.36.0,three@^0.180.0]" },
  { name: "HalftoneReveal", block: "hero", motion: "needs-motion", have: false, source: "registry HalftoneReveal-TS-TW deps=[ogl@^1.0.11]" },
  { name: "Hyperspeed", block: "media", motion: "needs-motion", have: false, source: "registry Hyperspeed-TS-TW deps=[postprocessing@^6.36.0,three@^0.180.0]" },
  { name: "ImageTrail", block: "media", motion: "needs-motion", have: false, source: "registry ImageTrail-TS-TW deps=[gsap@^3.13.0]" },
  { name: "InfiniteMenu", block: "navigation", motion: "static-safe", have: false, source: "registry InfiniteMenu-TS-TW deps=[gl-matrix@^3.4.3]" },
  { name: "Iridescence", block: "hero", motion: "needs-motion", have: false, source: "registry Iridescence-TS-TW deps=[ogl@^1.0.11]" },
  { name: "Lanyard", block: "media", motion: "static-safe", have: false, source: "registry Lanyard-TS-TW deps=[none]" },
  { name: "LaserFlow", block: "media", motion: "needs-motion", have: false, source: "registry LaserFlow-TS-TW deps=[three@^0.180.0]" },
  { name: "LetterGlitch", block: "text", motion: "static-safe", have: false, source: "registry LetterGlitch-TS-TW deps=[none]" },
  { name: "LightPillar", block: "media", motion: "needs-motion", have: false, source: "registry LightPillar-TS-TW deps=[three@^0.180.0]" },
  { name: "LightRays", block: "media", motion: "needs-motion", have: false, source: "registry LightRays-TS-TW deps=[ogl@^1.0.11]" },
  { name: "LightTunnel", block: "media", motion: "needs-motion", have: false, source: "registry LightTunnel-TS-TW deps=[ogl@^1.0.11]" },
  { name: "Lightfall", block: "hero", motion: "needs-motion", have: false, source: "registry Lightfall-TS-TW deps=[ogl@^1.0.11]" },
  { name: "Lightning", block: "media", motion: "static-safe", have: false, source: "registry Lightning-TS-TW deps=[none]" },
  { name: "LineSidebar", block: "navigation", motion: "static-safe", have: false, source: "registry LineSidebar-TS-TW deps=[none]" },
  { name: "LineWaves", block: "hero", motion: "needs-motion", have: false, source: "registry LineWaves-TS-TW deps=[ogl@^1.0.11]" },
  { name: "LiquidChrome", block: "media", motion: "needs-motion", have: false, source: "registry LiquidChrome-TS-TW deps=[ogl@^1.0.11]" },
  { name: "LiquidEther", block: "media", motion: "needs-motion", have: false, source: "registry LiquidEther-TS-TW deps=[three@^0.180.0]" },
  { name: "LogoLoop", block: "logo-strip", motion: "static-safe", have: false, source: "registry LogoLoop-TS-TW deps=[none]" },
  { name: "MagicBento", block: "feature-grid", motion: "needs-motion", have: false, source: "registry MagicBento-TS-TW deps=[gsap@^3.13.0]" },
  { name: "MagicRings", block: "media", motion: "needs-motion", have: false, source: "registry MagicRings-TS-TW deps=[three@^0.180.0]" },
  { name: "Magnet", block: "media", motion: "static-safe", have: false, source: "registry Magnet-TS-TW deps=[none]" },
  { name: "MagnetLines", block: "media", motion: "static-safe", have: false, source: "registry MagnetLines-TS-TW deps=[none]" },
  { name: "MaskedHeading", block: "media", motion: "needs-motion", have: false, source: "registry MaskedHeading-TS-TW deps=[gsap@^3.13.0]" },
  { name: "Masonry", block: "media", motion: "needs-motion", have: false, source: "registry Masonry-TS-TW deps=[gsap@^3.13.0]" },
  { name: "MetaBalls", block: "navigation", motion: "needs-motion", have: false, source: "registry MetaBalls-TS-TW deps=[ogl@^1.0.11]" },
  { name: "MetallicPaint", block: "media", motion: "static-safe", have: false, source: "registry MetallicPaint-TS-TW deps=[none]" },
  { name: "ModelViewer", block: "media", motion: "needs-motion", have: false, source: "registry ModelViewer-TS-TW deps=[@react-three/fiber@^9.3.0,@react-three/drei@^10.7.4,three@^0.180.0]" },
  { name: "MoltenMetal", block: "media", motion: "needs-motion", have: false, source: "registry MoltenMetal-TS-TW deps=[ogl@^1.0.11]" },
  { name: "MorphSlider", block: "media", motion: "needs-motion", have: false, source: "registry MorphSlider-TS-TW deps=[ogl@^1.0.11,gsap@^3.13.0]" },
  { name: "Noise", block: "hero", motion: "static-safe", have: false, source: "registry Noise-TS-TW deps=[none]" },
  { name: "OptionWheel", block: "media", motion: "static-safe", have: false, source: "registry OptionWheel-TS-TW deps=[none]" },
  { name: "Orb", block: "media", motion: "needs-motion", have: false, source: "registry Orb-TS-TW deps=[ogl@^1.0.11]" },
  { name: "OrbitImages", block: "media", motion: "needs-motion", have: false, source: "registry OrbitImages-TS-TW deps=[motion@^12.23.12]" },
  { name: "ParticleText", block: "text", motion: "static-safe", have: false, source: "registry ParticleText-TS-TW deps=[none]" },
  { name: "Particles", block: "hero", motion: "needs-motion", have: false, source: "registry Particles-TS-TW deps=[ogl@^1.0.11]" },
  { name: "PillNav", block: "navigation", motion: "needs-motion", have: false, source: "registry PillNav-TS-TW deps=[react-router-dom@^6.30.1,gsap@^3.13.0]" },
  { name: "PixelBlast", block: "media", motion: "needs-motion", have: false, source: "registry PixelBlast-TS-TW deps=[postprocessing@^6.36.0,three@^0.180.0]" },
  { name: "PixelCard", block: "feature-grid", motion: "static-safe", have: false, source: "registry PixelCard-TS-TW deps=[none]" },
  { name: "PixelSnow", block: "media", motion: "needs-motion", have: false, source: "registry PixelSnow-TS-TW deps=[three@^0.180.0]" },
  { name: "PixelTrail", block: "media", motion: "needs-motion", have: false, source: "registry PixelTrail-TS-TW deps=[@react-three/drei@^10.7.4,@react-three/fiber@^9.3.0,three@^0.180.0]" },
  { name: "PixelTransition", block: "media", motion: "needs-motion", have: false, source: "registry PixelTransition-TS-TW deps=[gsap@^3.13.0]" },
  { name: "Plasma", block: "media", motion: "needs-motion", have: false, source: "registry Plasma-TS-TW deps=[ogl@^1.0.11]" },
  { name: "PlasmaWave", block: "media", motion: "needs-motion", have: false, source: "registry PlasmaWave-TS-TW deps=[ogl@^1.0.11]" },
  { name: "Prism", block: "media", motion: "needs-motion", have: false, source: "registry Prism-TS-TW deps=[ogl@^1.0.11]" },
  { name: "PrismaticBurst", block: "media", motion: "needs-motion", have: false, source: "registry PrismaticBurst-TS-TW deps=[ogl@^1.0.11]" },
  { name: "ProfileCard", block: "feature-grid", motion: "static-safe", have: false, source: "registry ProfileCard-TS-TW deps=[none]" },
  { name: "Radar", block: "media", motion: "needs-motion", have: false, source: "registry Radar-TS-TW deps=[ogl@^1.0.11]" },
  { name: "ReflectiveCard", block: "feature-grid", motion: "static-safe", have: false, source: "registry ReflectiveCard-TS-TW deps=[lucide-react@^0.542.0]" },
  { name: "Ribbons", block: "media", motion: "needs-motion", have: false, source: "registry Ribbons-TS-TW deps=[ogl@^1.0.11]" },
  { name: "RippleDistortion", block: "media", motion: "needs-motion", have: false, source: "registry RippleDistortion-TS-TW deps=[ogl@^1.0.11]" },
  { name: "RippleGrid", block: "feature-grid", motion: "needs-motion", have: false, source: "registry RippleGrid-TS-TW deps=[ogl@^1.0.11]" },
  { name: "RotatingText", block: "text", motion: "needs-motion", have: false, source: "registry RotatingText-TS-TW deps=[motion@^12.23.12]" },
  { name: "Scanner", block: "media", motion: "needs-motion", have: false, source: "registry Scanner-TS-TW deps=[ogl@^1.0.11]" },
  { name: "ScrambledText", block: "text", motion: "needs-motion", have: false, source: "registry ScrambledText-TS-TW deps=[gsap@^3.13.0]" },
  { name: "ScrollExpand", block: "media", motion: "static-safe", have: false, source: "registry ScrollExpand-TS-TW deps=[none]" },
  { name: "ScrollFloat", block: "media", motion: "needs-motion", have: false, source: "registry ScrollFloat-TS-TW deps=[gsap@^3.13.0]" },
  { name: "ScrollReveal", block: "media", motion: "needs-motion", have: false, source: "registry ScrollReveal-TS-TW deps=[gsap@^3.13.0]" },
  { name: "ScrollStack", block: "feature-grid", motion: "needs-motion", have: false, source: "registry ScrollStack-TS-TW deps=[lenis@^1.3.13]" },
  { name: "ScrollVelocity", block: "media", motion: "needs-motion", have: false, source: "registry ScrollVelocity-TS-TW deps=[motion@^12.23.12]" },
  { name: "ShapeBlur", block: "media", motion: "needs-motion", have: false, source: "registry ShapeBlur-TS-TW deps=[three@^0.180.0]" },
  { name: "ShapeGrid", block: "feature-grid", motion: "static-safe", have: false, source: "registry ShapeGrid-TS-TW deps=[none]" },
  { name: "ShinyText", block: "text", motion: "needs-motion", have: false, source: "registry ShinyText-TS-TW deps=[motion@^12.23.12]" },
  { name: "Shuffle", block: "media", motion: "needs-motion", have: false, source: "registry Shuffle-TS-TW deps=[gsap@^3.13.0,@gsap/react@^2.1.2]" },
  { name: "SideRays", block: "media", motion: "needs-motion", have: false, source: "registry SideRays-TS-TW deps=[ogl@^1.0.11]" },
  { name: "Silk", block: "media", motion: "needs-motion", have: false, source: "registry Silk-TS-TW deps=[@react-three/fiber@^9.3.0,three@^0.180.0]" },
  { name: "SlicedWaves", block: "hero", motion: "needs-motion", have: false, source: "registry SlicedWaves-TS-TW deps=[ogl@^1.0.11]" },
  { name: "SoftAurora", block: "hero", motion: "needs-motion", have: false, source: "registry SoftAurora-TS-TW deps=[ogl@^1.0.11]" },
  { name: "SpecularButton", block: "cta", motion: "needs-motion", have: false, source: "registry SpecularButton-TS-TW deps=[ogl@^1.0.11]" },
  { name: "SplashCursor", block: "media", motion: "static-safe", have: false, source: "registry SplashCursor-TS-TW deps=[none]" },
  { name: "SplitFlapText", block: "text", motion: "static-safe", have: false, source: "registry SplitFlapText-TS-TW deps=[none]" },
  { name: "SplitText", block: "text", motion: "needs-motion", have: false, source: "registry SplitText-TS-TW deps=[gsap@^3.13.0,@gsap/react@^2.1.2]" },
  { name: "SpotlightCard", block: "feature-grid", motion: "static-safe", have: false, source: "registry SpotlightCard-TS-TW deps=[none]" },
  { name: "Stack", block: "feature-grid", motion: "needs-motion", have: false, source: "registry Stack-TS-TW deps=[motion@^12.23.12]" },
  { name: "StaggeredMenu", block: "navigation", motion: "needs-motion", have: false, source: "registry StaggeredMenu-TS-TW deps=[gsap@^3.13.0]" },
  { name: "StarBorder", block: "media", motion: "static-safe", have: false, source: "registry StarBorder-TS-TW deps=[none]" },
  { name: "Stepper", block: "media", motion: "needs-motion", have: false, source: "registry Stepper-TS-TW deps=[motion@^12.23.12]" },
  { name: "StickerPeel", block: "media", motion: "needs-motion", have: false, source: "registry StickerPeel-TS-TW deps=[gsap@^3.13.0]" },
  { name: "Strands", block: "media", motion: "needs-motion", have: false, source: "registry Strands-TS-TW deps=[ogl@^1.0.11]" },
  { name: "StrokeText", block: "text", motion: "needs-motion", have: false, source: "registry StrokeText-TS-TW deps=[gsap@^3.13.0]" },
  { name: "SwarmCursor", block: "media", motion: "needs-motion", have: false, source: "registry SwarmCursor-TS-TW deps=[ogl@^1.0.11]" },
  { name: "TargetCursor", block: "media", motion: "needs-motion", have: false, source: "registry TargetCursor-TS-TW deps=[gsap@^3.13.0]" },
  { name: "TextCursor", block: "text", motion: "needs-motion", have: false, source: "registry TextCursor-TS-TW deps=[motion@^12.23.12]" },
  { name: "TextLoop", block: "text", motion: "needs-motion", have: false, source: "registry TextLoop-TS-TW deps=[gsap@^3.13.0]" },
  { name: "TextPressure", block: "text", motion: "static-safe", have: false, source: "registry TextPressure-TS-TW deps=[none]" },
  { name: "TextType", block: "text", motion: "needs-motion", have: false, source: "registry TextType-TS-TW deps=[gsap@^3.13.0]" },
  { name: "Threads", block: "media", motion: "needs-motion", have: false, source: "registry Threads-TS-TW deps=[ogl@^1.0.11]" },
  { name: "TiltedCard", block: "feature-grid", motion: "needs-motion", have: false, source: "registry TiltedCard-TS-TW deps=[motion@^12.23.12]" },
  { name: "Topography", block: "media", motion: "needs-motion", have: false, source: "registry Topography-TS-TW deps=[ogl@^1.0.11]" },
  { name: "TrueFocus", block: "media", motion: "needs-motion", have: false, source: "registry TrueFocus-TS-TW deps=[motion@^12.23.12]" },
  { name: "VariableProximity", block: "media", motion: "needs-motion", have: false, source: "registry VariableProximity-TS-TW deps=[motion@^12.23.12]" },
  { name: "WarpText", block: "text", motion: "needs-motion", have: false, source: "registry WarpText-TS-TW deps=[ogl@^1.0.11]" },
  { name: "Waves", block: "hero", motion: "static-safe", have: false, source: "registry Waves-TS-TW deps=[none]" },
  { name: "WebThreads", block: "media", motion: "needs-motion", have: false, source: "registry WebThreads-TS-TW deps=[ogl@^1.0.11]" },
];

// Classified from declared deps: static-safe≈41, needs-live-runtime≈124.
// Fixture render is the final gate — index deps can miss next-themes / client-only usage.

// ---------------------------------------------------------------------------
// C. Work order — the real sequence to "solved"
// ---------------------------------------------------------------------------

export const REAL_REACT_WORK_ORDER = [
  {
    step: 0,
    title: "Decision: render target = live React for app preview + explicit static capture for Figma",
    why: "Everything else follows. Today renderToStaticMarkup is the end, which forbids Motion.",
  },
  {
    step: 1,
    title: "Renderer supports motion/react in the live path",
    why: "FREE_IMPORTS + prompt bans block it today. Without this, Kokonut/Magic/Aceternity stay at ~10% of their real value.",
  },
  {
    step: 2,
    title: "Vendor the static-safe set now (works even before live preview)",
    why: "Liquid Glass Card, Retro Grid, Noise Texture, Neon Gradient Card, Spotlight, Toolbar, social/v0/switch buttons, Magic device frames — all work statically.",
    components: [
      "kokonut: liquid-glass-card",
      "kokonut: toolbar, social-button, switch-button, v0-button",
      "magic-ui: RetroGrid, NoiseTexture, NeonGradientCard, PulsatingButton, Android",
      "aceternity: spotlight (static-safe subset)",
      "cult-ui: fluted-glass, circuit-board, copy-button",
    ],
  },
  {
    step: 3,
    title: "Vendor the Motion set once step 1 lands",
    why: "This is where the output starts looking like the demos.",
    components: [
      "kokonut: shape-hero, bento-grid, background-paths, beams-background, card-stack, spotlight-cards, morphic-navbar, type-writer",
      "magic-ui: HeroVideoDialog, AnimatedBeam, MagicCard, Meteors, Particles, NumberTicker, TextReveal, BlurFade, InteractiveGridPattern, LightRays, FileTree",
      "aceternity: hero-sections-free, feature-sections-free, animated-testimonials, 3d-marquee, infinite-moving-cards, card-spotlight, 3d-card-effect, background-beams, aurora-background, hero-highlight, hero-parallax, signup-form, floating-dock, resizable-navbar, macbook-scroll, typewriter-effect, flip-words, sticky-scroll-reveal, layout-grid, parallax-scroll",
      "cult-ui: shift-card, screen-capture, feature-sticky-section",
    ],
  },
  {
    step: 4,
    title: "Static capture mode for Figma from the same components",
    why: "Figma only sees resting state; make that a deliberate capture, not the only output.",
  },
  {
    step: 5,
    title: "Skills catch up",
    why: "Taste v2 (React-native), ui-ux-pro-max engine-side lookup, Emil/motion skills finally drive real motion instead of dying in prompt text.",
  },
] as const;

// ---------------------------------------------------------------------------
// D. Coverage vs blocks (quick sanity)
// ---------------------------------------------------------------------------

export function componentsForBlock(block: BlockKind): RealComponent[] {
  return [
    ...KOKONUT_COMPONENTS,
    ...MAGIC_UI_COMPONENTS,
    ...ACETERNITY_COMPONENTS,
    ...CULT_UI_COMPONENTS,
    ...BKLIT_COMPONENTS,
    ...REACTBITS_COMPONENTS,
  ].filter((c) => c.block === block);
}

export function motionBlockedComponents(): RealComponent[] {
  return [
    ...KOKONUT_COMPONENTS,
    ...MAGIC_UI_COMPONENTS,
    ...ACETERNITY_COMPONENTS,
    ...CULT_UI_COMPONENTS,
    ...REACTBITS_COMPONENTS,
  ].filter((c) => c.motion === "needs-motion");
}
