import type { ProjectCategory } from "../contracts/desktop-api/project";
import { DEFAULT_DETAILS_SECTIONS, DEFAULT_REFERO_APP_SECTIONS, type ResearchUiPatternGroup } from "../contracts/research";

// UI pattern references for Research collected by Stage (MCP), the way Stage for Mac's engine does it:
// one search per screen type (Refero for apps, Details for websites), then the groups the Research screen shows.
// Port of `apps/stage-engine/src/research/{context,refero_assets,ui_pattern_insights}.rs` and
// `apps/stage-engine/src/details/service.rs`; keep both in step.

export const SCREENS_PER_GROUP = 4;
const MIN_PATTERNS = 2;
const MAX_PATTERNS = 4;

export type ResearchSearchInput = {
  category: ProjectCategory;
  industry: string;
  brief?: string;
  targetUsers?: string;
  notes?: string;
  screenTypes: readonly string[];
};

export type ReferenceSearch = {
  id: string;
  title: string;
  source: "refero" | "details";
  platform: "web" | "ios";
  query: string;
};

export type ReferenceScreen = { id: string; title: string; productName?: string; sourceUrl?: string; thumbnailUrl?: string };
export type ReferenceGroup = { id: string; title: string; screens: ReferenceScreen[] };

// Fixed Refero queries per standard screen type (the engine's `build_category_query`).
const APP_PATTERNS: Record<string, { web: string; ios: string }> = {
  Onboarding: { web: "account signup onboarding wizard first run", ios: "mobile app onboarding signup first run" },
  Homepage: { web: "web app homepage product overview", ios: "mobile app home feed main screen" },
  Pricing: { web: "pricing page plans comparison table", ios: "mobile app paywall subscription pricing" },
  Checkout: { web: "checkout payment order summary", ios: "mobile checkout payment order summary" },
  Dashboard: { web: "orders analytics dashboard overview", ios: "mobile app dashboard overview" },
};

// App screen types the engine searches with a generic "<platform> <type> interface" query.
const APP_SCREEN_TYPES = new Set([
  ...Object.keys(APP_PATTERNS), "Login / Sign up", "Analytics / Reports", "Table / List", "Search", "Detail View", "Forms",
  "Settings", "Profile", "Team / Permissions", "Integrations", "Billing", "Browse / Discovery", "Notifications",
  "Empty State", "Success / Confirmation", "Splash Screen",
]);

const DESCRIPTOR_STOPWORDS = new Set(
  ("with that this have from your their they them will would should into about more than then when what which while where " +
    "users user product products platform app apps application website site service services company business customer " +
    "customers team teams build building make making want need needs looking help helps using based across also like " +
    "design designs page pages screen screens tool tools software solution solutions manage management").split(" "),
);

/** Up to 5 distinctive words from the brief/users/notes, so two same-industry projects don't get the same screens. */
function projectDescriptor(input: ResearchSearchInput) {
  const words = [input.brief, input.targetUsers, input.notes]
    .flatMap((text) => (text ?? "").toLowerCase().split(/[^\p{L}\p{N}]+/u))
    .filter((word) => word.length >= 4 && !DESCRIPTOR_STOPWORDS.has(word));
  return [...new Set(words)].slice(0, 5).join(" ");
}

function groupId(title: string) {
  return `ui-patterns-${title.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
}

/** The searches a Research run makes, one per screen type, exactly as the Mac engine builds them. */
export function referenceSearches(input: ResearchSearchInput): ReferenceSearch[] {
  if (input.category === "websites") {
    const sections = input.screenTypes.length > 0 ? input.screenTypes.slice(0, 5) : DEFAULT_DETAILS_SECTIONS;
    return sections.map((section) => ({ id: groupId(section), title: section, source: "details", platform: "web", query: `marketing website ${section} section` }));
  }
  const platform = input.category === "ios-apps" ? "ios" : "web";
  // Like the engine: any type it doesn't know (e.g. a website section) falls back to the five defaults.
  const allKnown = input.screenTypes.length > 0 && input.screenTypes.every((type) => APP_SCREEN_TYPES.has(type));
  const types = allKnown ? [...new Set(input.screenTypes)] : [...DEFAULT_REFERO_APP_SECTIONS];
  const qualifier = [input.industry.trim(), projectDescriptor(input)].filter(Boolean).join(" ");
  return types.map((type) => {
    const pattern = APP_PATTERNS[type]?.[platform] ?? `${platform === "ios" ? "mobile app" : "web app"} ${type} interface`;
    return { id: groupId(type), title: type, source: "refero", platform, query: `${pattern} ${qualifier}`.trim() };
  });
}

/** Keeps a group's screens unique across the run (the engine skips a screen already used by an earlier group). */
export function takeUniqueScreens(found: ReferenceScreen[][]): ReferenceScreen[][] {
  const seen = new Set<string>();
  return found.map((screens) => {
    const fresh = screens.filter((screen) => !seen.has(screen.id)).slice(0, SCREENS_PER_GROUP);
    fresh.forEach((screen) => seen.add(screen.id));
    return fresh;
  });
}

export type PatternInsight = { title: string; description: string };

/** "Title — description", 2–4 per group, titles ≤ 6 words, descriptions ≥ 4 words (the engine's standard). Null when unusable. */
export function cleanPatternInsights(patterns: PatternInsight[]): string[] | null {
  const seen = new Set<string>();
  const clean = patterns.flatMap(({ title, description }) => {
    const t = title.replace(/[—–]/g, " ").replace(/\s+/g, " ").trim().replace(/^[\p{P}\s]+|[\p{P}\s]+$/gu, "");
    const d = description.replace(/\s+/g, " ").trim();
    const ok = t && t.split(" ").length <= 6 && t.length <= 60 && d.split(" ").length >= 4 && d.length <= 240 && !seen.has(t.toLowerCase());
    if (!ok) return [];
    seen.add(t.toLowerCase());
    return [`${t} — ${d}`];
  }).slice(0, MAX_PATTERNS);
  return clean.length >= MIN_PATTERNS ? clean : null;
}

function evidence(screens: ReferenceScreen[]) {
  const products = [...new Set(screens.map((screen) => screen.productName?.trim()).filter(Boolean))].sort();
  if (products.length === 0) return "the selected reference screens";
  if (products.length === 1) return `screens from ${products[0]}`;
  if (products.length === 2) return `screens from ${products[0]} and ${products[1]}`;
  return `screens from ${products[0]}, ${products[1]}, and ${products[2]}`;
}

/** The Research screen's UI pattern groups from the collected screens plus the AI's recognized patterns. */
export function buildUiPatterns(groups: ReferenceGroup[], insights: Record<string, string[]>): ResearchUiPatternGroup[] {
  return groups.filter((group) => group.screens.length > 0).map((group) => {
    const recognizedPatterns = insights[group.id] ?? [];
    return {
      id: group.id,
      title: group.title,
      summary: `${group.title} references from ${evidence(group.screens)} provide focused design inspiration.`,
      patternCountLabel: recognizedPatterns.length > 0 ? `${recognizedPatterns.length} recognized patterns from ${group.screens.length} reference screens` : undefined,
      recognizedPatterns,
      examples: group.screens.map((screen) => ({
        id: screen.id,
        title: screen.title,
        imageUrl: screen.thumbnailUrl,
        thumbnailUrl: screen.thumbnailUrl,
        sourceProduct: screen.productName,
        sourceReferenceId: screen.id,
      })),
    };
  });
}

export type GroupInsights = { groupId: string; patterns: PatternInsight[] };

/** The AI's recognized patterns per collected group, cleaned; every group with screens needs 2–4 usable ones. */
export function groupPatternInsights(groups: ReferenceGroup[], raw: GroupInsights[]) {
  const insights: Record<string, string[]> = {};
  const problems: string[] = [];
  for (const group of groups.filter((entry) => entry.screens.length > 0)) {
    const clean = cleanPatternInsights(raw.find((entry) => entry.groupId === group.id)?.patterns ?? []);
    if (clean) insights[group.id] = clean;
    else problems.push(`uiPatternInsights "${group.id}": 2–4 patterns seen in its screens (title up to 6 words, description at least 4 words)`);
  }
  return { insights, problems };
}
