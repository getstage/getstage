import { RESEARCH_REFERENCE_SECTIONS, flowsArtifactSchema, aiStyleGuideSchema, researchArtifactSchema, researchUiPatternInsightsSchema, strategyArtifactSchema, wireframesArtifactSchema } from "@stage/data-ops/contracts";
import { z } from "zod";

// The steps an AI tool runs itself and saves to Stage. Instructions are condensed from the Mac app's
// engine prompts (`apps/stage-engine/src/<step>/prompt.rs`); keep them in step when those change.
// Moodboard + Style guide go through their own tools (search_references, add_to_moodboard, save_style_guide).
// Delivery (Figma/Paper/code export) stays on Stage for Mac.

// Stage fills in the envelope (project, version, kind); the AI only writes the content.
const ENVELOPE = { projectId: true, apiVersion: true, artifactKind: true } as const;

const COMMON = `A project's phases (Discovery, Design, …) are the client's timeline, not these steps. Create the project with create_project if it doesn't exist yet. Read the project first with get_project and the earlier steps with get_step_results. Ground everything in that saved context; no generic advice and no invented facts. Omit optional fields instead of sending null. Stage refuses placeholder text ("x", "TBD", "lorem ipsum") and results that break these rules; if saving fails, fix exactly what the error names and save again.`;

export const STEPS = {
  research: {
    tool: "save_research" as const,
    artifactKind: "researchArtifact",
    title: "Research",
    // Stage builds uiPatterns from the screens start_research collected; the AI adds what it recognizes in them.
    input: researchArtifactSchema
      .omit({ ...ENVELOPE, uiPatterns: true, uiPatternProvider: true, referoContext: true })
      .extend({ uiPatternInsights: researchUiPatternInsightsSchema }),
    instructions: `Step 1 of Stage, run like Stage for Mac: 1) get_research_inputs; ask the user for anything missing (industry, website, brief, up to 4 competitors, screens to analyze) and save it with set_research_inputs. 2) start_research: Stage starts collecting the UI pattern screens (Refero for apps, Details for websites) and returns a runId; call get_run_status every few seconds until it says ready and returns the groups; look at every screenshot. 3) save_research with that runId.
- Benchmark the project's website and its competitors.
- Look only at the project website and the competitors' sites: the homepage plus at most three relevant pages each.
- Every factual competitive claim needs a real fetched page listed in sourceReferences with its URL. No claim without evidence; never use memory as evidence.
- Focus on screens, layout, navigation, flows and components, not pricing or market strategy. Be concise.
- summary: 3–5 one-sentence bullets (max 20 words): what was benchmarked, the dominant UI pattern, the biggest UX gap, the headline opportunity.
- competitiveAnalysis matrix: the 7 labels Navigation, Onboarding, Visual Style, Content Hierarchy, Mobile Experience, Dashboard Layout, Data Visualization. Every cell has competitorId and score ("Strong" | "OK" | "Weak"), no note, no URLs.
- competitors: 2–4 (the saved competitors first), each with a one-sentence summary, 3–5 strengths and 3–5 weaknesses (short sentences seen on their pages).
- uiPatternInsights: for every group start_research returned, its groupId and 2–4 patterns you see in its screenshots (title up to 6 words, description one sentence). Stage builds the UI Patterns section from the collected screens.
- targetUsers: at most 2 personas with id, name, role, context, goals[], frustrations[] (each one short sentence, max 15 words).
- opportunities: 3–5, each with a title of 2–4 words, description one sentence (max 25 words), sourceSection one of summary, companySnapshot, competitiveAnalysis, uiPatterns, targetUsers.`,
  },
  strategy: {
    tool: "save_strategy" as const,
    artifactKind: "strategyArtifact",
    title: "Strategy",
    input: strategyArtifactSchema.omit(ENVELOPE),
    instructions: `Step 2 of Stage. Save Research first; Stage refuses Strategy without it.
- Exactly seven sections in this order (id, kind): direction (plain), principles (principles), audience (table), content (paragraph), positioning (boxes), pages (cards), accessibility (table).
- Specific to the saved Research. Every section status "action"; only the user approves in Stage.
- content: short labeled lines like "Voice: …", "CTA: …", "Empty states: …".
- positioning: 3 boxes titled FOLLOW, BREAK and AVOID.
- pages: 3–5 cards (title, objective, kpi, keyElement) grounded in Research opportunities and user needs.
- table rows are arrays: [label, value].`,
  },
  flows: {
    tool: "save_flows" as const,
    artifactKind: "flowsArtifact",
    title: "Flows",
    input: flowsArtifactSchema.omit(ENVELOPE),
    instructions: `Step 4 of Stage. Save Research and Strategy first; Stage refuses Flows without them. Use the Moodboard and Style guide (step 3) when present.
- The project type decides: websites get a Sitemap (one main board of pages, up to 18); web and iOS apps get Flows of functional screens for the core tasks, data, states and settings. Don't add marketing pages (Pricing, Blog, Contact…) to an app unless its scope includes a public site.
- Each step is a page with a short label and a stable screenId pointing to screens[]. Screens get specific keyElements grounded in the Strategy.
- Every flow status "Draft". Use short categories such as Navigation, Onboarding, Conversion, Evaluation, Client portal, Handoff.
- If Flows were saved before, keep every flow id, step id, screen id and connection; only refine labels, descriptions and screen elements. Stage keeps the saved canvas.`,
  },
  generate: {
    tool: "save_wireframes" as const,
    artifactKind: "wireframesArtifact",
    title: "Wireframes",
    input: wireframesArtifactSchema.omit(ENVELOPE),
    instructions: `Step 5 of Stage. Save Strategy and Flows first; Stage refuses Wireframes without them. Use the Style guide when present.
- One generatedScreens[] entry per screen picked from the Flows; each has 1–6 sections with 1–5 blocks; copySlots are short plain strings taken from the Strategy.
- Navigation follows the saved Flows connections; steps without a screenId are not screens.
- configureScreens[].required is true only for the 2–4 screens of the core funnel.
- For each screen you may add "html": one self-contained fragment in one root <div>, one <style> block, no scripts, frameworks or external CSS, no 100vh heights. Real copy from the Strategy, brand colours and fonts from the Style guide, WCAG-AA contrast, flat semantic markup.
- figmaSymbolUrl "https://figma.com/" (Stage sets the real one on Figma export).`,
  },
};

export const MOODBOARD_GUIDE = `Step 3 of Stage (after Strategy). 1) search_references finds real app and web screens on Refero; 2) add_to_moodboard stores the ones that fit (and/or direct image links, and/or a Figma link the user gives you) in a named direction, e.g. "Calm Editorial"; Stage keeps its own copies and charges the same credits as a Mac import; 3) save_style_guide writes that direction's style guide from its images. Look at the images (thumbnailUrl) before choosing; pick screens that match the Strategy's direction, not generic ones.`;

export const STYLE_GUIDE = {
  input: aiStyleGuideSchema,
  instructions: `Write the style guide for one moodboard direction (the one you added images to). Same rules as Stage for Mac:
- The direction's moodboard images are the visual source of truth for palette, typography, atmosphere and component tone. Use Research references and UI patterns as evidence for conventions and hierarchy; never let Research imagery, Strategy or defaults override the moodboard's look.
- No pure black #000000 (use a toned near-black). No generic AI purple/blue neon palettes or gradients over 80% saturation. At most one strong accent per palette group.
- typography.fontFamily: a distinctive typeface that matches the images (e.g. Geist, Fraunces, Space Grotesk, Satoshi). Never Inter, Helvetica, Arial, Roboto, Open Sans, Lato, system-ui, a bare sans-serif stack, or Times/Georgia/Garamond/Palatino (Stage replaces those with Geist).
- atmosphere: cover Density, Variance and Motion where possible; value like "8/10", position 0–100. If Variance is above 4/10, avoid centered-hero language.
- colorPalettes: each has 8–11 hex colors from light to dark, a label, the main hex and highlightIndex.
- typography.rows: stable string ids, Tailwind-like className ("text-[21px] font-semibold"), lineHeight like "100%" or "150%". componentSwatchCount is usually 6.
- No filler like "scroll to explore". Stage adds the id, direction, category conventions, Research reference ids and implementation notes.
- spec: the Style Guide editor's format (what the user edits in Stage and what DESIGN.md is built from):
  - intent: the direction's name and one line on what it should feel like.
  - references: for each image of this direction (ids from get_step_results "moodboard"), what you like about it and what to look at when building (Layout, Typography, Color, …).
  - colors.light and colors.dark: background, surface, text, mutedText, border, primary (#RRGGBB, readable contrast); roles: the six UI areas in both modes.
  - fonts (heading, body, mono, size), shape (corners, depth, density), rules (do / don't), typescale (Display 72, H1 48, H2 32, H3 22, Body 16 style rows), layout, motion and components (button shape and label, container titles).`,
};

export const STEP_GUIDE = `Stage runs a project in 6 steps: Research → Strategy → Moodboard & Style guide → Flows → Wireframes → Delivery. You do the first five here, in that order, with their tools (Stage links each step to the ones before it. Saving a step again keeps the later steps; the response's "stale" list names the ones built on the old result: ask the user before redoing them); the user reviews them in Stage (web or Mac). For Delivery, call get_build_brief and build the product from it; Figma and Paper exports are done in Stage for Mac. ${COMMON}`;

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
