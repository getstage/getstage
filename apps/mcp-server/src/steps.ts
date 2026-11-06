import { flowsArtifactSchema, researchArtifactSchema, strategyArtifactSchema, wireframesArtifactSchema } from "@stage/data-ops/contracts";

// The steps an AI tool runs itself and saves to Stage. Instructions are condensed from the Mac app's
// engine prompts (`apps/stage-engine/src/<step>/prompt.rs`); keep them in step when those change.
// Moodboard/Style guide and Delivery stay on Stage for Mac (image search and exports).

const COMMON = `Read the project first with get_project and the earlier steps with get_step_results. Ground everything in that saved context; no generic advice and no invented facts. Use apiVersion "v1" and the project's id as projectId. Omit optional fields instead of sending null. If saving fails, fix exactly what the error names and save again.`;

export const STEPS = {
  research: {
    tool: "save_research",
    title: "Research",
    schema: researchArtifactSchema,
    instructions: `Step 1 of Stage. Benchmark the project's website and its competitors.
- Look only at the project website and the competitors' sites: the homepage plus at most three relevant pages each.
- Every factual competitive claim needs a real fetched page listed in sourceReferences with its URL. No claim without evidence; never use memory as evidence.
- Focus on screens, layout, navigation, flows and components, not pricing or market strategy. Be concise.
- summary: 3–5 one-sentence bullets (max 20 words): what was benchmarked, the dominant UI pattern, the biggest UX gap, the headline opportunity.
- competitiveAnalysis matrix: the 7 labels Navigation, Onboarding, Visual Style, Content Hierarchy, Mobile Experience, Dashboard Layout, Data Visualization. Every cell has competitorId and score ("Strong" | "OK" | "Weak"), no note, no URLs.
- targetUsers: at most 2 personas with id, name, role, context, goals[], frustrations[] (each one short sentence, max 15 words).
- opportunities: 3–5, title 2–4 words, description one sentence (max 25 words), sourceSection one of summary, companySnapshot, competitiveAnalysis, uiPatterns, targetUsers.
- artifactKind "researchArtifact".`,
  },
  strategy: {
    tool: "save_strategy",
    title: "Strategy",
    schema: strategyArtifactSchema,
    instructions: `Step 2 of Stage. Needs a saved Research.
- Exactly seven sections in this order (id, kind): direction (plain), principles (principles), audience (table), content (paragraph), positioning (boxes), pages (cards), accessibility (table).
- Specific to the saved Research. Every section status "action"; only the user approves in Stage.
- content: short labeled lines like "Voice: …", "CTA: …", "Empty states: …".
- positioning: 3 boxes titled FOLLOW, BREAK and AVOID.
- pages: 3–5 cards (title, objective, kpi, keyElement) grounded in Research opportunities and user needs.
- table rows are arrays: [label, value].
- artifactKind "strategyArtifact"; researchArtifactId = the saved Research's id.`,
  },
  flows: {
    tool: "save_flows",
    title: "Flows",
    schema: flowsArtifactSchema,
    instructions: `Step 4 of Stage (after Moodboard). Needs saved Research and Strategy.
- The project type decides: websites get a Sitemap (one main board of pages, up to 18); web and iOS apps get Flows of functional screens for the core tasks, data, states and settings. Don't add marketing pages (Pricing, Blog, Contact…) to an app unless its scope includes a public site.
- Each step is a page with a short label and a stable screenId pointing to screens[]. Screens get specific keyElements grounded in the Strategy.
- Every flow status "Draft". Use short categories such as Navigation, Onboarding, Conversion, Evaluation, Client portal, Handoff.
- If Flows were saved before, keep every flow id, step id, screen id and connection; only refine labels, descriptions and screen elements. Stage keeps the saved canvas.
- artifactKind "flowsArtifact"; researchArtifactId and strategyArtifactId = the saved ids.`,
  },
  generate: {
    tool: "save_wireframes",
    title: "Wireframes",
    schema: wireframesArtifactSchema,
    instructions: `Step 5 of Stage. Needs saved Flows (and Strategy, Style guide when present).
- One generatedScreens[] entry per screen picked from the Flows; each has 1–6 sections with 1–5 blocks; copySlots are short plain strings taken from the Strategy.
- Navigation follows the saved Flows connections; steps without a screenId are not screens.
- configureScreens[].required is true only for the 2–4 screens of the core funnel.
- For each screen you may add "html": one self-contained fragment in one root <div>, one <style> block, no scripts, frameworks or external CSS, no 100vh heights. Real copy from the Strategy, brand colours and fonts from the Style guide, WCAG-AA contrast, flat semantic markup.
- artifactKind "wireframesArtifact"; figmaSymbolUrl "https://figma.com/" (Stage sets the real one on Figma export).`,
  },
};

export const STEP_GUIDE = `Stage runs a project in 6 steps: Research → Strategy → Moodboard & Style guide → Flows → Wireframes → Delivery. You do Research, Strategy, Flows and Wireframes here and save each with its save tool; the user reviews them in Stage (web or Mac). Moodboard & Style guide and Delivery are done in Stage for Mac. ${COMMON}`;
