import type { ProjectCategory } from "../contracts/desktop-api/project";
import type { FlowsArtifact } from "../contracts/flows";
import type { GeneratedStyleGuide } from "../contracts/moodboard";
import type { ResearchArtifact } from "../contracts/research";
import type { StrategyArtifact } from "../contracts/strategy";
import type { WireframesArtifact } from "../contracts/wireframes";

// Content rules for step results written by the user's own AI tool (MCP). The Mac engine gets the same
// quality from its prompts and output schemas; an outside AI can send anything, so Stage checks it at save
// and refuses with every problem named by field. Rules mirror the MCP tool instructions (`apps/mcp-server/src/steps.ts`).

type Problems = string[];

// Placeholder text an AI sends instead of content ("x", "TBD", "lorem ipsum", "...").
const PLACEHOLDER = /^(x+|tbd|todo|tba|n\/?a|none|null|undefined|placeholder|lorem( ipsum)?.*|asdf|\.+|-+|_+|\?+)$/i;
// Fields that are allowed to be very short (emoji, scores, enum-like values, hex colours).
const SHORT_OK = new Set(["emoji", "score", "kind", "status", "sourceSection", "provider", "emphasis", "priority", "lineHeight", "weight"]);

/** Every string that is empty, a single character or a placeholder, by path. */
function placeholderProblems(value: unknown, path: string, out: Problems, key = "") {
  if (typeof value === "string") {
    const text = value.trim();
    const shownToUser = !SHORT_OK.has(key) && key !== "id" && !key.endsWith("Id");
    if (shownToUser && (text.length < 2 || PLACEHOLDER.test(text))) out.push(`${path}: "${value}" is a placeholder, not content`);
    return;
  }
  if (Array.isArray(value)) value.forEach((item, index) => placeholderProblems(item, `${path}[${index}]`, out, key));
  else if (value && typeof value === "object") {
    for (const [childKey, child] of Object.entries(value)) {
      if (childKey === "html") continue; // checked and cleaned separately
      placeholderProblems(child, path ? `${path}.${childKey}` : childKey, out, childKey);
    }
  }
}

function countBetween(out: Problems, path: string, items: readonly unknown[], min: number, max: number) {
  if (items.length < min || items.length > max) {
    out.push(`${path}: needs ${min === max ? min : `${min}–${max}`} items, got ${items.length}`);
  }
}

function duplicateIds(out: Problems, path: string, ids: string[]) {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) out.push(`${path}: id "${id}" is used twice`);
    seen.add(id);
  }
}

// The competitive matrix rows, as the Mac engine writes them.
const MATRIX_LABELS = ["Navigation", "Onboarding", "Visual Style", "Content Hierarchy", "Mobile Experience", "Dashboard Layout", "Data Visualization"];

/** "details" for website projects, "refero" for apps. */
export function uiPatternProvider(category: ProjectCategory) {
  return category === "websites" ? "details" : "refero";
}

function researchProblems(research: ResearchArtifact): Problems {
  const out: Problems = [];
  const sources = research.sourceReferences;
  const sourceIds = new Set(sources.map((source) => source.id));
  if (!sources.some((source) => source.url)) out.push("sourceReferences: list every fetched page with its url; Research without evidence is refused");
  sources.forEach((source, index) => {
    if (source.provider === "website" && !source.url) out.push(`sourceReferences[${index}].url: a website source needs its url`);
  });
  countBetween(out, "summary", research.summary, 3, 5);
  countBetween(out, "targetUsers", research.targetUsers, 1, 2);
  countBetween(out, "opportunities", research.opportunities, 3, 5);
  research.opportunities.forEach((opportunity, index) => {
    if (!opportunity.title) out.push(`opportunities[${index}].title: a 2–4 word title`);
  });
  research.targetUsers.forEach((user, index) => {
    if (user.goals.length === 0) out.push(`targetUsers[${index}].goals: at least one goal`);
    if (user.frustrations.length === 0) out.push(`targetUsers[${index}].frustrations: at least one frustration`);
  });

  const { competitors, matrixRows } = research.competitiveAnalysis;
  countBetween(out, "competitiveAnalysis.competitors", competitors, 2, 4);
  const labels = matrixRows.map((row) => row.label).join(", ");
  if (labels !== MATRIX_LABELS.join(", ")) out.push(`competitiveAnalysis.matrixRows: needs the 7 rows ${MATRIX_LABELS.join(", ")}, in that order`);
  const competitorIds = new Set(competitors.map((competitor) => competitor.id));
  duplicateIds(out, "competitiveAnalysis.competitors", competitors.map((competitor) => competitor.id));
  competitors.forEach((competitor, index) => {
    const path = `competitiveAnalysis.competitors[${index}]`;
    if (!competitor.summary && !competitor.positioning) out.push(`${path}.summary: one sentence on what ${competitor.name} is`);
    countBetween(out, `${path}.strengths`, competitor.strengths, 3, 5);
    countBetween(out, `${path}.weaknesses`, competitor.weaknesses, 3, 5);
    competitor.sourceReferenceIds.forEach((id) => {
      if (!sourceIds.has(id)) out.push(`competitiveAnalysis.competitors[${index}].sourceReferenceIds: "${id}" is not in sourceReferences`);
    });
  });
  matrixRows.forEach((row, rowIndex) => {
    if (row.cells.length !== competitors.length) out.push(`competitiveAnalysis.matrixRows[${rowIndex}].cells: score every competitor (${competitors.length})`);
    row.cells.forEach((cell, cellIndex) => {
      if (!competitorIds.has(cell.competitorId)) {
        out.push(`competitiveAnalysis.matrixRows[${rowIndex}].cells[${cellIndex}].competitorId: "${cell.competitorId}" is not a competitor`);
      }
    });
  });
  return out;
}

// The seven Strategy sections, in order, with the field each kind fills (same as the Mac engine prompt).
const STRATEGY_SECTIONS = [
  { id: "direction", kind: "plain", field: "body" },
  { id: "principles", kind: "principles", field: "principles" },
  { id: "audience", kind: "table", field: "table" },
  { id: "content", kind: "paragraph", field: "body" },
  { id: "positioning", kind: "boxes", field: "boxes" },
  { id: "pages", kind: "cards", field: "cards" },
  { id: "accessibility", kind: "table", field: "table" },
] as const;

function strategyProblems(strategy: StrategyArtifact): Problems {
  const out: Problems = [];
  if (strategy.sections.length !== STRATEGY_SECTIONS.length) {
    out.push(`sections: needs exactly 7 sections (${STRATEGY_SECTIONS.map((section) => section.id).join(", ")}), got ${strategy.sections.length}`);
  }
  STRATEGY_SECTIONS.forEach((expected, index) => {
    const section = strategy.sections[index];
    if (!section) return;
    const path = `sections[${index}]`;
    if (section.id !== expected.id || section.kind !== expected.kind) {
      out.push(`${path}: must be id "${expected.id}" with kind "${expected.kind}", got "${section.id}" / "${section.kind}"`);
      return;
    }
    if ((section[expected.field]?.length ?? 0) === 0) out.push(`${path}.${expected.field}: empty`);
  });
  const positioning = strategy.sections.find((section) => section.id === "positioning");
  const boxTitles = (positioning?.boxes ?? []).map((box) => box.title.trim().toUpperCase()).join(",");
  if (positioning && boxTitles !== "FOLLOW,BREAK,AVOID") out.push(`positioning.boxes: needs the 3 boxes FOLLOW, BREAK, AVOID, got ${boxTitles || "none"}`);
  const pages = strategy.sections.find((section) => section.id === "pages");
  if (pages) countBetween(out, "pages.cards", pages.cards ?? [], 3, 5);
  return out;
}

function flowsProblems(flows: FlowsArtifact): Problems {
  const out: Problems = [];
  if (flows.flows.length === 0) out.push("flows: at least one flow");
  if (flows.screens.length === 0) out.push("screens: at least one screen");
  const screenIds = new Set(flows.screens.map((screen) => screen.id));
  duplicateIds(out, "flows", flows.flows.map((flow) => flow.id));
  duplicateIds(out, "screens", flows.screens.map((screen) => screen.id));
  flows.flows.forEach((flow, flowIndex) => {
    if (flow.steps.length === 0) out.push(`flows[${flowIndex}].steps: a flow needs steps`);
    duplicateIds(out, `flows[${flowIndex}].steps`, flow.steps.map((step) => step.id));
    flow.steps.forEach((step, stepIndex) => {
      if (step.screenId && !screenIds.has(step.screenId)) {
        out.push(`flows[${flowIndex}].steps[${stepIndex}].screenId: "${step.screenId}" is not in screens`);
      }
    });
  });
  flows.screens.forEach((screen, index) => {
    if (screen.keyElements.length === 0) out.push(`screens[${index}].keyElements: at least one key element`);
  });
  return out;
}

function wireframesProblems(wireframes: WireframesArtifact, flowsScreenIds: ReadonlySet<string>): Problems {
  const out: Problems = [];
  if (wireframes.generatedScreens.length === 0) out.push("generatedScreens: at least one screen");
  duplicateIds(out, "generatedScreens", wireframes.generatedScreens.map((screen) => screen.id));
  wireframes.generatedScreens.forEach((screen, index) => {
    const path = `generatedScreens[${index}]`;
    if (!flowsScreenIds.has(screen.id)) out.push(`${path}.id: "${screen.id}" is not a screen in the saved Flows`);
    countBetween(out, `${path}.sections`, screen.sections, 1, 6);
    screen.sections.forEach((section, sectionIndex) => countBetween(out, `${path}.sections[${sectionIndex}].blocks`, section.blocks, 1, 5));
    if (screen.html !== undefined && !/<(div|header|main|section)\b/i.test(screen.html)) out.push(`${path}.html: needs semantic layout elements (div/header/main/section)`);
  });
  wireframes.configureScreens.forEach((screen, index) => {
    if (!flowsScreenIds.has(screen.id)) out.push(`configureScreens[${index}].id: "${screen.id}" is not a screen in the saved Flows`);
  });
  return out;
}

export type AiStepResult =
  | { step: "research"; artifact: ResearchArtifact }
  | { step: "strategy"; artifact: StrategyArtifact }
  | { step: "flows"; artifact: FlowsArtifact }
  | { step: "generate"; artifact: WireframesArtifact; flowsScreenIds: ReadonlySet<string> };

/** Everything wrong with an AI-written step result; empty when it can be saved. */
export function aiStepProblems(result: AiStepResult): Problems {
  const out: Problems = [];
  placeholderProblems(result.artifact, "", out);
  switch (result.step) {
    case "research":
      return [...out, ...researchProblems(result.artifact)];
    case "strategy":
      return [...out, ...strategyProblems(result.artifact)];
    case "flows":
      return [...out, ...flowsProblems(result.artifact)];
    case "generate":
      return [...out, ...wireframesProblems(result.artifact, result.flowsScreenIds)];
  }
}

const HEX = /^#[0-9a-f]{6}$/i;

/** Everything wrong with an AI-written style guide (same rules as the MCP save_style_guide instructions). */
export function styleGuideProblems(guide: GeneratedStyleGuide): Problems {
  const out: Problems = [];
  placeholderProblems(guide, "", out);
  if (guide.colorPalettes.length === 0) out.push("colorPalettes: at least one palette");
  guide.colorPalettes.forEach((palette, index) => {
    const path = `colorPalettes[${index}]`;
    countBetween(out, `${path}.colors`, palette.colors, 8, 11);
    palette.colors.forEach((color, colorIndex) => {
      if (!HEX.test(color)) out.push(`${path}.colors[${colorIndex}]: "${color}" is not a #RRGGBB hex colour`);
      else if (color.toLowerCase() === "#000000") out.push(`${path}.colors[${colorIndex}]: no pure black #000000; use a toned near-black`);
    });
    if (!HEX.test(palette.hex)) out.push(`${path}.hex: "${palette.hex}" is not a #RRGGBB hex colour`);
    if (palette.highlightIndex !== undefined && palette.highlightIndex >= palette.colors.length) {
      out.push(`${path}.highlightIndex: ${palette.highlightIndex} is outside the ${palette.colors.length} colours`);
    }
  });
  if (guide.typography.rows.length === 0) out.push("typography.rows: at least one text style");
  return out;
}

/** Throws one error naming every problem (first 8, on one line), so the AI can fix them all in one retry. */
export function assertNoProblems(what: string, problems: Problems) {
  if (problems.length === 0) return;
  const more = problems.length > 8 ? ` (+${problems.length - 8} more)` : "";
  throw new Error(`${what} was not saved. Fix and save again: ${problems.slice(0, 8).join("; ")}${more}`);
}

/**
 * Removes anything executable from an AI-written wireframe: scripts, embedded frames/objects,
 * `on…` event handlers and `javascript:` links. The web already renders it in a script-less sandbox;
 * the Client Portal is public, so the stored HTML itself must be clean.
 */
export function sanitizeWireframeHtml(html: string): string {
  return html
    .replace(/<(script|iframe|object|embed|frameset|noscript)\b[\s\S]*?<\/\1\s*>/gi, "")
    .replace(/<\/?(script|iframe|object|embed|frame|frameset|noscript|base|meta|link)\b[^>]*>/gi, "")
    .replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/(href|src|action|formaction|xlink:href)\s*=\s*("|')?\s*javascript:[^"'>\s]*\2?/gi, "$1=\"#\"");
}

export type SavedStep = { id: string; content: Record<string, unknown> } | null;

/**
 * Later steps built on an earlier result that has since been replaced or removed (e.g. Flows made from the
 * previous Research). A result that doesn't record an upstream id is not flagged.
 */
export function staleSteps(saved: { research: SavedStep; strategy: SavedStep; flows: SavedStep; wireframes: SavedStep }) {
  const builtOnOld = (step: SavedStep, links: [string, SavedStep][]) =>
    step !== null && links.some(([key, upstream]) => typeof step.content[key] === "string" && step.content[key] !== upstream?.id);
  // A step built on a stale step is stale too (new Research → Strategy, Flows and Wireframes).
  const strategy = builtOnOld(saved.strategy, [["researchArtifactId", saved.research]]);
  const flows = saved.flows !== null && (strategy || builtOnOld(saved.flows, [["researchArtifactId", saved.research], ["strategyArtifactId", saved.strategy]]));
  const wireframes = saved.wireframes !== null && (strategy || flows || builtOnOld(saved.wireframes, [["strategyArtifactId", saved.strategy], ["flowsArtifactId", saved.flows]]));
  return [...(strategy ? ["strategy"] : []), ...(flows ? ["flows"] : []), ...(wireframes ? ["wireframes"] : [])];
}
