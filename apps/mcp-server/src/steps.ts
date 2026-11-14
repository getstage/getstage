import { RESEARCH_REFERENCE_SECTIONS, flowsArtifactSchema, aiStyleGuideSchema, researchArtifactSchema, researchUiPatternInsightsSchema, strategyArtifactSchema, wireframesArtifactSchema } from "@stage/data-ops/contracts";
import { z } from "zod";

// The steps an AI tool runs itself and saves to Stage. The rules are condensed from the Mac app's engine prompts
// (`apps/stage-engine/src/<step>/prompt.rs`); keep them in step when those change.
// Tool descriptions state facts only: what the tool does, what Stage accepts, prerequisites, what it replaces and
// what it charges. The order of work lives in INSTRUCTIONS (the server's instructions), not in tool descriptions.
// Moodboard + Style guide go through their own tools (search_references, add_to_moodboard, save_style_guide).
// Delivery (Figma/Paper/code export) stays on Stage for Mac.

// Stage fills in the envelope (project, version, kind); the AI only writes the content.
const ENVELOPE = { projectId: true, apiVersion: true, artifactKind: true } as const;

const ACCEPTS = `Stage refuses placeholder text ("x", "TBD", "lorem ipsum"), null for optional fields, and results that break these rules; the error names the field.`;

export const STEPS = {
  research: {
    tool: "save_research" as const,
    artifactKind: "researchArtifact",
    title: "Research",
    // Stage builds uiPatterns from the screens start_research collected; the AI adds what it recognizes in them.
    input: researchArtifactSchema
      .omit({ ...ENVELOPE, uiPatterns: true, uiPatternProvider: true, referoContext: true })
      .extend({ uiPatternInsights: researchUiPatternInsightsSchema }),
    instructions: `Step 1 of 6. Saves into the run start_research opened (runId) and charges 27 credits when the save succeeds. Saving again keeps later steps and lists in "stale" the ones built on the old Research.
What Stage accepts:
- A benchmark of the project's website and its competitors: the homepage plus at most three relevant pages each, about screens, layout, navigation, flows and components (not pricing or market strategy).
- Every factual competitive claim backed by a fetched page listed in sourceReferences with its URL.
- summary: 3–5 one-sentence bullets (max 20 words): what was benchmarked, the dominant UI pattern, the biggest UX gap, the headline opportunity.
- competitiveAnalysis matrix: the 7 labels Navigation, Onboarding, Visual Style, Content Hierarchy, Mobile Experience, Dashboard Layout, Data Visualization. Every cell has competitorId and score ("Strong" | "OK" | "Weak"), no note, no URLs.
- competitors: 2–4 (the saved competitors first), each with a one-sentence summary, 3–5 strengths and 3–5 weaknesses.
- uiPatternInsights: for every group the run collected, its groupId and 2–4 patterns seen in its screenshots (title up to 6 words, description one sentence).
- targetUsers: at most 2 personas with id, name, role, context, goals[], frustrations[] (each one short sentence, max 15 words).
- opportunities: 3–5, each with a title of 2–4 words, description one sentence (max 25 words), sourceSection one of summary, companySnapshot, competitiveAnalysis, uiPatterns, targetUsers.
${ACCEPTS}`,
  },
  strategy: {
    tool: "save_strategy" as const,
    artifactKind: "strategyArtifact",
    title: "Strategy",
    input: strategyArtifactSchema.omit(ENVELOPE),
    instructions: `Step 2 of 6. Requires saved Research. No credits. Saving again keeps later steps and lists in "stale" the ones built on the old Strategy.
What Stage accepts:
- Exactly seven sections in this order (id, kind): direction (plain), principles (principles), audience (table), content (paragraph), positioning (boxes), pages (cards), accessibility (table).
- Every section status "action" (the user approves sections in Stage).
- content: short labeled lines like "Voice: …", "CTA: …", "Empty states: …".
- positioning: 3 boxes titled FOLLOW, BREAK and AVOID.
- pages: 3–5 cards (title, objective, kpi, keyElement).
- table rows are arrays: [label, value].
${ACCEPTS}`,
  },
  flows: {
    tool: "save_flows" as const,
    artifactKind: "flowsArtifact",
    title: "Flows",
    input: flowsArtifactSchema.omit(ENVELOPE),
    instructions: `Step 4 of 6. Requires saved Research and Strategy. No credits. Saving again keeps the saved canvas and later steps, and lists in "stale" the ones built on the old Flows.
What Stage accepts:
- Websites: a Sitemap (one main board of pages, up to 18). Web and iOS apps: Flows of functional screens for the core tasks, data, states and settings.
- Each step is a page with a short label and a stable screenId pointing to screens[]; screens have keyElements.
- Every flow status "Draft", with a short category such as Navigation, Onboarding, Conversion, Evaluation, Client portal, Handoff.
- When Flows were saved before, the same flow, step and screen ids and connections.
${ACCEPTS}`,
  },
  generate: {
    tool: "save_wireframes" as const,
    artifactKind: "wireframesArtifact",
    title: "Wireframes",
    input: wireframesArtifactSchema.omit(ENVELOPE),
    instructions: `Step 5 of 6. Requires saved Strategy and Flows. No credits.
What Stage accepts:
- One generatedScreens[] entry per screen from the Flows; each has 1–6 sections with 1–5 blocks; copySlots are short plain strings.
- Navigation that follows the saved Flows connections; steps without a screenId are not screens.
- configureScreens[].required true only for the 2–4 screens of the core funnel.
- Optional "html" per screen: one self-contained fragment in one root <div>, one <style> block, no scripts, frameworks or external CSS, no 100vh heights.
- figmaSymbolUrl "https://figma.com/" (Stage sets the real one on Figma export).
${ACCEPTS}`,
  },
};

export const STYLE_GUIDE = {
  input: aiStyleGuideSchema,
  instructions: `Part of step 3 of 6 (Moodboard & Style guide). Requires the direction to have moodboard images. No credits. Wireframes use it.
What Stage accepts (same rules as Stage for Mac):
- A palette, typography, atmosphere and component tone taken from the direction's moodboard images.
- No pure black #000000. No neon purple/blue palettes or gradients over 80% saturation. At most one strong accent per palette group.
- typography.fontFamily: a distinctive typeface (e.g. Geist, Fraunces, Space Grotesk, Satoshi). Stage replaces Inter, Helvetica, Arial, Roboto, Open Sans, Lato, system-ui, a bare sans-serif stack and Times/Georgia/Garamond/Palatino with Geist.
- atmosphere: Density, Variance and Motion where possible; value like "8/10", position 0–100.
- colorPalettes: each has 8–11 hex colors from light to dark, a label, the main hex and highlightIndex.
- typography.rows: stable string ids, Tailwind-like className ("text-[21px] font-semibold"), lineHeight like "100%" or "150%". componentSwatchCount is usually 6.
- spec: the Style Guide editor's format (what the user edits in Stage and what DESIGN.md is built from):
  - intent: the direction's name and one line on what it should feel like.
  - references: for each image of this direction (ids from get_step_results "moodboard"), what it shows and what to look at when building (Layout, Typography, Color, …).
  - colors.light and colors.dark: background, surface, text, mutedText, border, primary (#RRGGBB, readable contrast); roles: the six UI areas in both modes.
  - fonts (heading, body, mono, size), shape (corners, depth, density), rules (do / don't), typescale (Display 72, H1 48, H2 32, H3 22, Body 16 style rows), layout, motion and components (button shape and label, container titles).
Stage adds the id, direction, category conventions, Research reference ids and implementation notes.
${ACCEPTS}`,
};

// The server's instructions: how the tools fit together (clients show these to the model as server guidance).
export const INSTRUCTIONS = `Stage runs a project in 6 steps: Research → Strategy → Moodboard & Style guide → Flows → Wireframes → Delivery. Each step builds on the saved earlier ones, and the user reviews every step in Stage (web or Mac).
- Project: list_projects, or create_project for a new one. A project's phases (Discovery, Design, …) are the client's timeline, not these steps. get_project and get_step_results give the saved context each step builds on.
- Research: get_research_inputs; missing form fields (industry, website, brief, up to 4 competitors, screens to analyze) come from the user and are saved with set_research_inputs. start_research collects UI pattern screens in the background and returns a runId; get_run_status reports progress and returns the groups when ready (usually under a minute); save_research saves the result with that runId.
- Moodboard & Style guide (after Strategy): search_references finds real screens on Refero; add_to_moodboard imports chosen screens, image links or a Figma link into a named direction and returns a runId; get_run_status reports when the import is done; save_style_guide saves that direction's style guide.
- Flows, then Wireframes: save_flows and save_wireframes.
- Delivery: get_build_brief returns everything saved for the project in one spec. Figma and Paper exports are in Stage for Mac.
Saving a step again keeps the later steps; the response's "stale" list names the ones built on the old result, and the user decides whether to redo them. Results are grounded in the project's saved context; Stage refuses placeholders and names the field when a save fails.`;

// The Research form (same fields and "Screens to analyze" options as Stage for Mac).
export const RESEARCH_INPUTS = z.object({
  industry: z.string().min(1).describe("e.g. SaaS, Fintech, E-commerce"),
  website: z.string().optional().describe("The product's website, if it has one"),
  brief: z.string().min(40).describe("What the product does, who it's for and what makes it different"),
  competitorUrls: z.array(z.string()).max(4).default([]).describe("Up to 4 competitor websites"),
  screenTypes: z.array(z.enum(RESEARCH_REFERENCE_SECTIONS)).min(1).max(6)
    .describe("Screens to analyze. Apps: e.g. Onboarding, Homepage, Pricing, Checkout, Dashboard, Settings. Websites: e.g. Hero, Features, Social Proof, Pricing, Contact."),
});

/** A save tool's input. Research saves into the run start_research opened; the other steps have no run. */
export function stepToolInput(step: keyof typeof STEPS) {
  const base = z.object({
    projectId: z.string().describe("Project id from list_projects."),
    summary: z.string().optional().describe("One line for the project overview."),
    result: STEPS[step].input,
  });
  return step === "research" ? base.extend({ runId: z.string().min(1).describe("The runId start_research returned.") }) : base;
}
