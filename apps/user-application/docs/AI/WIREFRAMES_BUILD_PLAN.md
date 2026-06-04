# Wireframes — build plan (end-to-end)

Last updated: 2026-06-04 (Phase 1–5 landed)
Audience: engineering (build order)
Related: [`MOODBOARD_BUILD_PLAN.md`](./MOODBOARD_BUILD_PLAN.md) · [`MOODBOARD_DEV_STATUS.md`](./MOODBOARD_DEV_STATUS.md) · [`STRATEGY_DEV_STATUS.md`](./STRATEGY_DEV_STATUS.md) · [`RESEARCH_DEV_STATUS.md`](./RESEARCH_DEV_STATUS.md) · [`STAGE_AI_WORKFLOW_CONTEXT_PLAN.md`](./STAGE_AI_WORKFLOW_CONTEXT_PLAN.md)

> Concrete build order to take Wireframes from fixture-driven UI to a real engine workflow that uses Claude/Codex to produce typed wireframe specs from the rest of the project (Flows + Strategy + Research + Moodboard). High-level status will live in `WIREFRAMES_DEV_STATUS.md` once Phase 1 lands.

## Current state (2026-06-04)

End-to-end wireframes generation is wired:

- ✅ Contract carries `sections[].blocks[]` per generated screen.
- ✅ Convex saves under `module: "generate"`, `kind: "wireframesArtifact"`.
- ✅ Engine: `RunMode::Wireframes` → `WireframesWorkflow` → Strategy (required) + Research/Moodboard/Flows (optional) → Claude/Codex prompt → normalize → Convex.
- ✅ Desktop: clicking **Generate {n} Wireframes** invokes `startRun(mode: wireframes)`; `ResultsGrid` renders block stacks per screen.
- Static gates: `cargo check` clean (no new warnings), `convex:typecheck` ✓, `desktop:typecheck` ✓.

Open items (Phase 6+): brand-kit PDF upload, true Hi-Fi token resolution from moodboard direction, Convert-to-High-fi re-run, Assets dialog on full regen.

---

## Locked decisions

| # | Decision | Choice |
|---|----------|--------|
| A | Scope (phases 1–6) | Lo-Fi text/JSON wireframes → Hi-Fi with style guide tokens → brand-kit ingest → Figma export (optional) |
| B | Inputs | **Flows** (screen list + journeys) · **Strategy** (page goals, CTAs, audience) · **Research** (competitor UI patterns, personas) · **Moodboard** (`styleGuides[]` for Hi-Fi) · **Brand kit PDF** (Hi-Fi `brand-kit` source) |
| C | Refero | **No** in V1. Wireframes are structural; the LLM produces structure better than retrieval. Revisit as optional "reference layouts" panel in V2 (see Phase 6). |
| D | Provider | Claude or Codex — same selection rule as Strategy: `projectAiContexts.lastProviderId` → localStorage → first ready in Settings |
| E | Output shape | **Block-level JSON per screen** (`screens[].sections[].blocks[]`), not ASCII art and not Figma frames in V1. JSON renders Lo-Fi via existing `WireframePrimitives.tsx`. |
| F | Two run kinds | `mode: wireframes` with `wireframeKind: lofi \| hifi` in run context. **No** separate run mode for Hi-Fi — same engine workflow, Hi-Fi adds style guide / brand-kit token application after normalize. |
| G | Storage | `projectAiArtifacts` with `module: "generate"`, `kind: "wireframesArtifact"` (already wired for read). Latest-per-project; old rows replaced on full regen (mirrors Strategy). |
| H | Re-run policy | Full regen replaces the wireframes artifact + R2 keys (brand kit, Hi-Fi previews). **Does not** auto-delete Assets — downstream prompt if asset rows exist (same pattern as research/strategy re-run). |
| I | Engine `RunMode` | Add `RunMode::Wireframes`. Do **not** reuse `RunMode::Generation` (Generation is a different track in `STAGE_AI_WORKFLOW_CONTEXT_PLAN`). |
| J | Brand kit ingest | PDF upload → R2 `wireframes-brandkit` → engine extracts text/tokens via provider; no separate brand-kit run, executed inline in the wireframes workflow when `brandSource: brand-kit`. |
| K | Style guide source | When `brandSource: style-guide` and Moodboard has `styleGuides[]`, pass selected `styleDirectionId` → engine resolves the matching `MoodboardStyleGuide` and inlines its tokens. |

---

## Architecture

```txt
React (WireframesTab, useWireframesTab)
  → Electron IPC startRun(mode: wireframes, context: { wireframeKind, brandSource, styleDirectionId?, brandKitAssetKey? })
  → stage-engine wireframes/workflow.rs
       → wireframes/context.rs   (load flows + strategy + research + moodboard styleGuides)
       → wireframes/prompt.rs    (XML-tagged: <inputs><style_rules><screens><output_schema>)
       → providers (Claude/Codex CLI, same pattern as Strategy)
       → helpers/provider_json.rs (extract wireframesArtifact JSON line)
       → convex_store/wireframes_repository.rs (normalize → save)
       → Convex saveWireframesArtifact → deletePreviousWireframesArtifacts
  → getLatestWireframesArtifact → React renders block JSON via WireframePrimitives
```

Rules (same as Research/Strategy/Moodboard):

- React does not call providers or Refero directly.
- Provider JSON is normalized in `wireframes_repository.rs` before Convex save (Strategy pattern).
- Artifact optional fields are **omitted**, not JSON `null` (Zod `.optional()` would fail).
- Token from Electron → Stage Engine (`STAGE_AI_WORKFLOW_CONTEXT_PLAN` desktop path).

---

## Contract extension (Phase 1)

Today `wireframesArtifact` stores only screen metadata. To render real block layouts, extend `packages/data-ops/src/contracts/wireframes.ts`:

```ts
// Add — block primitives the renderer already understands
export const wireframeBlockKindSchema = z.enum([
  "header", "hero", "feature-grid", "testimonial", "pricing-table",
  "cta", "form", "logo-strip", "footer", "stat-strip", "faq", "media",
  "text", "list", "table", "navigation",
]);

export const wireframeBlockSchema = z.object({
  id: z.string().min(1),
  kind: wireframeBlockKindSchema,
  intent: z.string().min(1),        // one-line purpose, drives Lo-Fi label
  copySlots: z.record(z.string()).optional(), // { headline, sub, cta, ... }
  emphasis: z.enum(["primary", "secondary", "tertiary"]).default("secondary"),
  notes: z.string().optional(),
});

export const wireframeSectionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  blocks: z.array(wireframeBlockSchema).default([]),
});

// Extend wireframeGeneratedScreenSchema:
export const wireframeGeneratedScreenSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  priority: z.string().min(1),
  generatedAtLabel: z.string().min(1),
  figmaUrl: z.string().url().optional(),
  // NEW
  goal: z.string().optional(),       // page goal pulled from Strategy
  sections: z.array(wireframeSectionSchema).default([]),
  brandTokens: z.object({            // present only when wireframeKind=hifi
    paletteRef: z.string().optional(),
    typographyRef: z.string().optional(),
  }).optional(),
});
```

Notes:

- Keep the existing fields; downstream UI consumes them today.
- Lo-Fi runs leave `brandTokens` omitted.
- Hi-Fi runs inline a reference (`paletteRef`/`typographyRef` = style guide id or brand-kit asset id) so the renderer can theme without storing pixels.

---

## Engine module layout (Phase 2 — mirrors Strategy/Moodboard)

```txt
apps/stage-engine/src/wireframes/
  workflow.rs        # orchestrator: load context → prompt → provider → normalize → save
  context.rs         # fetch flows + strategy + research artifacts; resolve moodboard style guide
  prompt.rs          # XML-tagged provider prompt (lofi vs hifi branch on wireframeKind)
  provider_json.rs   # (or extend helpers/provider_json.rs) extract wireframesArtifact line
```

`runs/mod.rs` routes `RunMode::Wireframes → WireframesWorkflow` (same shape as the Moodboard route added June 2026).

`models/runs.rs`: add `RunMode::Wireframes` (lowercased `"wireframes"`).

`convex_store/wireframes_repository.rs`: `get_wireframes_input` (Flows + Strategy + Research + Moodboard pointers), `save_wireframes_artifact` (normalize), `delete_previous_wireframes_artifacts`.

---

## Prompt shape (Phase 3)

Use XML-tagged sections (consensus pattern in Claude wireframe skills) + a 5-phase cognitive model (collapsed from the public 7-phase skill):

```txt
<role>UX wireframe generator</role>
<inputs>
  <project>...name, brief, audience snippet</project>
  <strategy>...page goals + CTAs per screen</strategy>
  <flows>...screen list + journey order</flows>
  <research_patterns>...recognised UI patterns by category</research_patterns>
  <style_guide optional/>            <!-- hifi only -->
  <brand_kit optional/>              <!-- hifi + brand-kit only -->
</inputs>
<rules>
  <fidelity>{{lofi|hifi}}</fidelity>
  <output_only_json/>
  <use_provided_block_kinds/>
  <one_screen_per_array_entry/>
</rules>
<screens>{{ list with id, title, priority, goal }}</screens>
<output_schema>{{ inlined wireframesArtifact JSON schema sketch }}</output_schema>
<cognitive_steps>
  1. Restate each screen's goal in one sentence.
  2. Choose 4–8 sections per Page (1–3 per Section kind).
  3. Pick blocks from the allowed kinds; assign emphasis.
  4. Fill copySlots from Strategy CTAs/value props; placeholder otherwise.
  5. Return a single JSON object matching <output_schema>.
</cognitive_steps>
```

Critical: tell the model `"Return ONLY a single line starting with {\"artifactKind\":\"wireframesArtifact\""` so `provider_json.rs` extraction works (same convention as `strategyArtifact` / `researchArtifact`).

---

## Normalize (Phase 4 — Strategy pattern)

In `wireframes_repository.rs`:

- Drop blocks with unknown `kind` (don't fail the run; warn).
- Coerce missing `sections` → use a default per-screen skeleton from the Configure list.
- Ensure every selected screen from input appears in `generatedScreens[]` (fill missing screens with a placeholder section + a warning note).
- For Hi-Fi: inject `brandTokens` from the resolved style guide / brand-kit reference.
- Stamp `generatedAt` / `generatedAtLabel`; never trust the model's timestamp.

---

## Progress audit

Status: ⬜ todo · 🟡 in progress · ✅ done

| Step | What | Status | Notes |
|-----:|------|:------:|-------|
| 1.1 | Extend `wireframes.ts` contract (`sections`, `blocks`, `brandTokens`) | ✅ | `packages/data-ops/src/contracts/wireframes.ts` — added `wireframeBlockKindSchema`, `wireframeBlockSchema`, `wireframeSectionSchema`, `wireframeBrandTokensSchema`, plus `goal/sections/brandTokens` on `wireframeGeneratedScreenSchema` |
| 1.2 | `saveWireframesArtifact` + `deletePreviousWireframesArtifacts` Convex handlers | ✅ | `convex/lib/projectAi/handlers/wireframes.ts` (new) + registered in `projectAi.ts`. `deletePreviousWireframesArtifacts` already existed in `artifactStore.ts` |
| 1.3 | Static gates pass (`convex:typecheck`, `desktop:typecheck`) | ✅ | `z.record(z.string(), z.string())` fix + mock fixture extended with `sections: []` |
| 2.1 | `RunMode::Wireframes` in `models/runs.rs` | ✅ | Added variant + matching `"wireframes"` in `engine-run.ts` |
| 2.2 | `wireframes/workflow.rs` skeleton + `runs/mod.rs` route | ✅ | Full workflow (not skeleton) — see 3.x/4.x. RunManager wires `Some(wireframes)` |
| 2.3 | `wireframes/context.rs` — load flows/strategy/research/moodboard | ✅ | Folded into `wireframes_repository.fetch_wireframes_input` (matches Flows pattern — no separate file) |
| 2.4 | `convex_store/wireframes_repository.rs` — read input + save + delete-previous | ✅ | `fetch_wireframes_input` / `create_wireframes_run` / `complete_wireframes_run` / `fail_wireframes_run` |
| 3.1 | `wireframes/prompt.rs` — Lo-Fi branch | ✅ | XML-tagged with `<role>`, `<rules>`, `<cognitive_steps>`, `<output_schema>`; same builder handles Lo-Fi + Hi-Fi |
| 3.2 | `wireframes/prompt.rs` — Hi-Fi branch (inline style guide / brand-kit tokens) | 🟡 | Hi-Fi flag flows through `kind=hifi`; brand-kit/style-guide moodboard JSON is passed in. Token injection into prompt scaffolded; deeper extraction is Phase 6 |
| 3.3 | `provider_json.rs` — extract `wireframesArtifact` line | ✅ | `extract_wireframes_artifact` + `wireframes_shape_is_normalizable` |
| 4.1 | Normalize: drop unknown blocks, fill missing screens, stamp time | ✅ | `wireframes/normalize.rs` — ALLOWED_BLOCK_KINDS filter, default ids, generatedAt stamping |
| 4.2 | Hi-Fi: resolve style guide / brand-kit and inject `brandTokens` | ⬜ | Phase 6 — passes provider's `brandTokens` through but doesn't yet resolve moodboard direction |
| 5.1 | Wire `useWireframesTab.generateWireframes` to `startRun(mode: wireframes)` | ✅ | New `useWireframesRun` hook (Flows pattern) + WireframesTab watches Convex live artifact for completion |
| 5.2 | `ResultsGrid` reads `sections[].blocks[]` and renders Lo-Fi blocks | ✅ | New `BlockPreview` + `BlockTile` in `ResultsGrid.tsx`; emphasis controls block height; copy-slot headline as label. `Open in Figma` linked to `figmaUrl` when present |
| 5.3 | `Convert to High-fi` button in `ResultsGrid` → re-run with `wireframeKind: hifi` | ⬜ | Existing UI already calls this; needs to invoke `generateWireframes({wireframeKind: "hifi"})` instead of switching `step` only |
| 6.1 | Brand kit upload → R2 `wireframes-brandkit` | ⬜ | Same uploader pattern as `moodboard-upload` |
| 6.2 | Engine: brand-kit asset download + text/token extraction in prompt | ⬜ | Inline `<brand_kit>` excerpt |
| 7.1 | `UpstreamStaleBanner` flags wireframes when Flows/Strategy/Moodboard newer | ✅ | Already present in `WireframesTab.tsx` (carried from earlier work) |
| 7.2 | Re-run policy + downstream "Clear Assets?" dialog | ⬜ | Match research re-run dialog |
| 8.1 | (Optional V2) Figma export via Figma MCP — write generated screens to a Figma file | ⬜ | Phase out of V1 |
| 8.2 | (Optional V2) Refero "reference layouts" side panel per screen | ⬜ | Off by default |

---

## Phase split (build order)

### Phase 1 — Contract + Convex save (foundation, no UI change)
- Extend `wireframes.ts`; add `saveWireframesArtifact` handler.
- Acceptance: `convex:typecheck` + `desktop:typecheck` pass. No runtime change.

### Phase 2 — Engine scaffold (still no UI change)
- `RunMode::Wireframes`, `wireframes/workflow.rs`, `wireframes_repository.rs`.
- Workflow returns a hand-written stub artifact (no LLM yet) so the IPC path is end-to-end.
- Acceptance: `cargo check` + manual `startRun(mode: wireframes)` from Electron → Convex artifact appears.

### Phase 3 — Real provider run (Lo-Fi)
- `prompt.rs` (Lo-Fi only), provider invoke via `providers::process`, `provider_json` extract.
- Hook UI to `startRun`; wire `Generate {n} Wireframes` button.
- Acceptance: clicking Generate produces a real `wireframesArtifact` with `sections[].blocks[]` for each selected screen.

### Phase 4 — Lo-Fi rendering
- Map `blocks[]` → `WireframePrimitives` blocks in `ResultsGrid`.
- Acceptance: results grid shows block layouts (not placeholder image tiles).

### Phase 5 — Hi-Fi + brand source
- Style guide branch: resolve selected direction from Moodboard `styleGuides[]`, inject tokens.
- Brand kit branch: upload PDF → R2, engine reads via existing R2 asset path.
- `Convert to High-fi` re-runs with `wireframeKind: hifi`.
- Acceptance: Hi-Fi run themes the Lo-Fi structure; brand kit text influences copy slots.

### Phase 6 — Hardening
- Upstream stale banner; re-run dialog; brand-kit PDF size cap (5 MB, match brief cap).
- (Optional) Figma export + Refero reference panel.

---

## Convex data model (no new tables)

| Table | Purpose | Cardinality |
|-------|---------|-------------|
| `projectAiContexts` | `wireframeKind`, `brandSource`, `layoutPreference`, `lastProviderId` (key reuse) | One per project |
| `projectAiRuns` | Failed/cancelled only | Many during failure, deleted on success |
| `projectAiArtifacts` | `module: "generate"`, `kind: "wireframesArtifact"` | **One active** — replaced on full regen |

R2 purposes: `wireframes-brandkit` (PDF). No Hi-Fi image bytes in V1 (renderer is HTML, not raster).

---

## Inputs the engine reads from Convex (Phase 2 — `context.rs`)

| Source | Field used | Purpose |
|--------|------------|---------|
| `getLatestFlowsArtifact` (when shipped) or `getProjectContext` fallback | `screens[]` | Authoritative screen list |
| `getLatestStrategyArtifact` | sections (positioning, audience, key pages, content strategy) | Page goals + CTA copy + audience tone |
| `getLatestResearchArtifact` | `uiPatterns[]`, `competitive`, personas summary | Pattern hints + audience snippet |
| `getLatestMoodboardArtifact` | `styleGuides[]` (selected by `styleDirectionId`) | Hi-Fi palette/typography |
| Configure form (already in tab) | `selectedScreenIds[]`, `layoutPreference` | User intent overrides |

If Flows artifact does not exist yet, V1 uses the Configure list as the screen source (today's seed). Document explicitly that Flows-driven mode lands when the Flows workflow ships.

---

## Verification commands

```bash
cd packages/data-ops && npx convex dev    # Terminal 1
cd apps/user-application && pnpm dev      # Terminal 2
kill $(lsof -t -i:48221)                  # after Rust changes, restart Terminal 2

cargo check
pnpm --dir packages/data-ops exec convex codegen
pnpm --dir packages/data-ops run convex:typecheck
pnpm run desktop:typecheck
```

Success signals (Lo-Fi run):

```txt
[stage-engine] wireframes workflow started kind=lofi screens=N
[stage-engine] starting wireframes provider run provider=claude|codex
[stage-engine] wireframes artifact saved to Convex screens=N blocks=M
run_completed finalText="Wireframes generated."
```

Hi-Fi adds:

```txt
[stage-engine] wireframes workflow started kind=hifi brand_source=style-guide direction_id=…
[stage-engine] wireframes brand tokens applied palette=… typography=…
```

---

## Re-run policy (mirrors Research/Strategy)

| Action | Wireframes effect | Downstream |
|--------|--------------------|-------------|
| Re-run Research | unchanged unless user picks "Clear later steps" | dialog |
| Re-run Strategy | unchanged unless user picks "Clear later steps" | dialog |
| Re-run Moodboard / new style guide | unchanged; `UpstreamStaleBanner` shown | manual regen |
| Re-run Wireframes (full) | replaces artifact + brand-kit R2; **prompts** before clearing Assets | dialog |
| Section regen (per-screen) | patches one `generatedScreens[i]`; no R2 churn | none |

---

## What we explicitly are **not** building in V1

- Refero search in the wireframes workflow (Decision C).
- Figma frame writes (Phase 8.1 — optional V2).
- Pixel-rendered Hi-Fi (Hi-Fi is themed HTML primitives, not raster images).
- Per-block regenerate (per-screen only in V1; matches Strategy section-level granularity).
- A separate `RunMode::WireframesHiFi` (Decision F).

---

## Open product decisions (to confirm before Phase 3)

1. Should `Generate {n} Wireframes` be blocked when Strategy is not approved? Recommended: soft-warn via `UpstreamStaleBanner`, do not hard-block (matches Moodboard Decision 1).
2. Should Hi-Fi require an approved style guide direction, or accept the first available? Recommended: require an explicit pick on the Style Guide step (already in UI today).
3. Brand kit max size? Recommended: 5 MB to match the research brief upload cap.
4. Per-screen regen — same engine workflow with a single-screen scope flag, or a separate `source: "section:screenId"` field on the run context (Strategy pattern)? Recommended: copy the Strategy `source: section:…` convention.
