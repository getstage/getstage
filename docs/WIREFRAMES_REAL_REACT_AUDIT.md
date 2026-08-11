# !!! Wireframes real-React audit (progress)

> **Living progress table.** Update every session so Werner knows where we are,
> what is stuck, and where we left off.
>
> **Direction:** [`WIREFRAMES_REAL_REACT_LIBRARIES.md`](WIREFRAMES_REAL_REACT_LIBRARIES.md)  
> **Component inventory (data, not progress):** `packages/wireframe-renderer/manifests/wireframesQualityInventory.ts`  
> **Supersedes:** `WIREFRAMES_SESSION_AUDIT_2026-08-09.md` (deleted 2026-08-11)

**Legend:** `[x]` done · `[~]` partial · `[ ]` not started · `[!]` blocked

---

## Status right now

| Field | Value |
|-------|--------|
| **Last updated** | 2026-08-11 (dump diagnosis → quality backlog) |
| **Phase** | Pipeline works (live React + dumps). **Quality gap is clear:** model under-uses showcase packs / never uses motion. See § Quality diagnosis below. |
| **Busy on** | Nothing — handoff-ready |
| **Left off** | Documented first full dump analysis (`1f3717f2-…`). Next: prompt + validation pressure so `@stage/sections` showcase comps + `motion/react` actually get used. |
| **Blocker** | Not infra — **model output quality** (Card/Button spam; broken JSON; missing tsx; bad Lucide names) |

---

## Handoff — current state (for the next agent)

### DONE + verified
- **R1 (live React preview):** renderer emits `liveHtml` — an esbuild IIFE bundle (React + ReactDOM/client + `motion` + the vendored components, tsconfig-path resolved) wrapped in a self-contained HTML doc with the run stylesheet inlined. Offloaded to R2 as `text/html` → `liveUrl`. The preview **dialog** fetches via IPC (`fetchR2TextRaw`) → `srcDoc` + `sandbox="allow-scripts"` (opaque origin — no app / Convex / IPC access). Static `renderToStaticMarkup` html is kept for Figma export, card thumbnail, and fallback.
- **R2 (motion allowed):** `motion` + `motion/react` added to `FREE_IMPORTS`; prompt now instructs live motion **and** "the resting frame must still look complete" (Figma is a static capture).
- **R3 acquisition pipeline:** `packages/wireframe-renderer/scripts/vendor-registry.mjs`. `GET /r/<name>.json` → reject motion/external deps (unless `--allow-motion`) → adapt `next/*` + strip next/image props → merge keyframes into `globals.css` → wire library index + `libraries.json`. Handles default-export + PascalCase. **The fixture render is the final gate** (deps list misses hidden imports).
- **R3a (static-safe, all fixture-gated):** Kokonut **21→25**, Magic UI **17→33**, **React Bits** new pack (7). Exact names: session log below + `STAGE_LIBRARY_EXPORTS` in the inventory.
- **React Bits** = selectable `sections` pack (icon = Werner's SVG, `public/logos/component-packs/react-bits.svg`).

### Files touched (R1/R2)
- Renderer: `src/cli.ts` (`FREE_IMPORTS`, `buildLiveDocument`, `liveHtml` output, `ScreenOutput`), `package.json` (+`motion`, +`esbuild`).
- Engine: `wireframes/render.rs` (`RenderScreenOut.live_html` + map-back), `wireframes/workflow.rs` (`offload_rendered_screens` uploads liveHtml → `liveUrl`, dropped on failure — too big to inline), `wireframes/prompt.rs` (motion block + allowed-imports line).
- Contract/Convex: `packages/data-ops/src/contracts/wireframes.ts` (`liveHtml`/`liveUrl`), `convex/lib/projectAi/domain/researchContent.ts` (resolve `liveUrl`). `collectR2KeysFromJson` already sweeps `liveUrl` for cleanup.
- App: `types/project/wireframesTab.ts`, `lib/project/mapWireframesArtifactToTabData.ts`, `components/project/tabs/wireframes/WireframeHtmlPreview.tsx` (live `<iframe src={liveUrl} sandbox="allow-scripts">`), `ResultsGrid.tsx` (passes `liveUrl`), `lib/settings/skillsCatalog.ts` (React Bits pack).

### Verified how
renderer `tsc` + `pnpm test` (smoke 4/4) · headless-browser motion proof · `cargo build` + `cargo test wireframes` 58/58 · data-ops build + convex `tsc` · UI `tsc` (after a `pnpm install` reconcile — `pnpm add` had de-linked vite types). **NOT run by me:** the full in-app Electron E2E — Werner/next agent confirms by generating a run and opening a screen.

### How to test in the app
`pnpm run dev` in `apps/user-application` → generate a wireframe (model may now use `motion/react`) → open a screen **full-size** → it runs **live with motion**. Thumbnails + Figma stay static.

### NEXT — in order (quality first, then more vendors)
1. **Q1 — Prompt: force showcase + motion** (see § Quality diagnosis). Require `@stage/sections` showcase comps + `motion/react`; ban Card-only when a sections pack is selected.
2. **Q2 — Validate Lucide named exports** (or alias unknowns) before render — stops `Figma`-style repair doubles.
3. **Q3 — Harden / retry broken provider JSON** (unescaped control characters).
4. **Q4 — Hi-Fi: reject outline-only screens** (no `tsx`) instead of merging empties.
5. **R3b — bulk-vendor motion set** with `--allow-motion` so forced imports resolve.
6. **R4** — motion skills useful once Q1 forces motion.
7. Live-bundle size optimization later.

### Caveats
- Live bundle ~500 KB/screen. · Aceternity 401. · React Bits MIT+Commons Clause.
- **Packs selected ≠ packs used** — dumps prove the model can ignore Magic UI / motion.

---

## Quality diagnosis (from real dumps)

> Living section. Update after each dump you care about.  
> **Inspect:** Electron log → `path=/tmp/stage-wireframes/<run_id>` → open folder. Start with `00-meta.json`, `03-tsx-*.tsx`, `06-render-summary.json`.

### How content vs components work

| Layer | Source | Role |
|-------|--------|------|
| **Copy / product truth** | Research, strategy, flows, moodboard (in the prompt) | Headlines, goals — **not** from UI libraries |
| **Component packs** | User selection → `@stage/base` / `@stage/sections` / `@stage/charts` | Vendored React in `packages/wireframe-renderer` (no live registry fetch at runtime) |
| **Free imports** | `react`, `lucide-react`, `motion/react` | Icons + motion |
| **Provider output** | Selected provider (Claude or Codex) writes `tsx` | Chooses which exports to import — **quality bottleneck today** |
| **Renderer** | esbuild live + static HTML | Only compiles what the model wrote |

Slot map: **kokonut-ui → `@stage/base`**, **magic-ui → `@stage/sections`**, **bklit-ui → `@stage/charts`**.

### Dump `1f3717f2-3831-483a-b46b-873002343493` (2026-08-11)

**Selected:** `kokonut-ui` + `magic-ui` + `bklit-ui` · skills `ui-ux-pro-max`, `emil-design-eng` · scoped: signup, project-dashboard, decision-log, reports-archive.

**What this scoped run actually produced:**

| Screen | New output | Library use | Verdict |
|--------|------------|-------------|---------|
| decision-log | Usable TSX | Kokonut primitives + `DotPattern`; no Bklit; no Motion | Functional but generic; its declared `stat-strip` was rendered as text totals |
| reports-archive | Usable TSX | Kokonut primitives + `DotPattern`; no Bklit; no Motion | Same visual recipe repeated; generic stat cards |
| project-dashboard | No parsed screen | Malformed JSON: an unescaped newline inside the TSX JSON string | Parse retry required |
| signup | Outline only | Sections/blocks, but no `tsx` and no `html` | Completeness gate required |

**Merged-artifact warning:** the dump also contains TSX/static/live files for existing untouched screens. Those are useful renderer fixtures but are not new provider output from this four-screen scoped run. The `Figma` Lucide failure came from one of those merged screens, so it proves import validation is needed but does not belong in the scoped-generation score.

**Infra OK:** the two usable scoped screens and merged React screens produced live bundles with `liveHasProcessStub=true` (~500 KB).

### Design-guidance and library audit (2026-08-11)

This corrects the earlier “force 2–3 showcase components per screen” idea. Component count is not design quality.

**Selected skills:**
- **UI UX Pro Max:** its core workflow is *product/audience/style analysis → one master design system → page-specific overrides*, tuned by variance, motion, and density. Stage currently skips that workflow and injects the prose/source corpus into every independent screen prompt. The Stage adapter is also stale: it still says self-contained HTML instead of React TSX.
- **Emil Design Engineering:** quality comes from compounded details and a cohesive interaction vocabulary. Motion is frequency- and purpose-dependent: spatial continuity, state indication, explanation, or feedback. Repeated/keyboard actions should have little or no animation; occasional and first-time moments can carry delight. The Stage adapter incorrectly says React/Motion is not shipped.
- The upstream skill sources contain agent-operating instructions (`CLAUDE_PLUGIN_ROOT`, “respond only…”, filesystem/search commands). Those are reference material, not wireframe instructions, and must not be pasted into either Claude or Codex generation prompts.

**Selected libraries:**
- **Kokonut UI:** a mixture of primitives and specific compositions. `LiquidGlassCard`/`LiquidButton` can create a signature surface; `CardFlip` has a clear feature-card role. `CarouselCards` is an experience-marketplace composition, not a generic business-app carousel. Do not force components outside their semantic fit.
- **Magic UI:** mostly effects, overlays, text treatments, device frames, and a few structural compositions (`BentoGrid`). `DotPattern`, `ShineBorder`, or `Meteors` are decoration; using one does not prove the screen was composed from the library. Effects need a strong underlying layout and must be capped to avoid visual noise.
- **Bklit UI:** Stage currently exports small deterministic SVG charts, not the full upstream library. Use charts only for real comparisons/trends/distributions. A row of categorical totals does not automatically need a chart.

**Provider contract:** `build_wireframes_prompt` is shared by Claude and Codex. All design/execution rules must be provider-neutral; no provider name, plugin path, tool-use instruction, or provider-specific response behavior belongs in the generated prompt.

**Dump correction:** run `1f3717f2-…` targeted four screens. Only decision-log and reports-archive returned usable new TSX; signup returned an outline with no TSX/HTML, and project-dashboard returned malformed JSON. The other TSX files in the dump are merged existing screens, so they must not be counted as new output from this run.

### How to improve (ordered)

| # | Change | Why | Where |
|---|--------|-----|--------|
| Q1a | Build one compact run-level design brief: aesthetic thesis, typography, palette roles, spacing/radius/elevation, density, variance, and motion vocabulary | Gives every parallel screen the same design system | `prompt.rs` (derived from strategy + moodboard + project type) |
| Q1b | Add a page-level execution brief with the screen role, hierarchy, density override, and 1–2 semantically fitting component recipes | Components support the screen instead of being sprayed everywhere | `prompt.rs` + structured `libraries.json` recipes |
| Q1c | Put a short provider-neutral execution contract **after all project JSON**, immediately before output | Current critical rules are followed by large artifact blobs and a later static-motion contradiction | `prompt.rs` |
| Q1d | Quality gate actual TSX: base-only, decoration-only, chart fit, motion purpose, invalid/missing imports, and cross-screen repetition; repair only the failing screen | Prompt compliance becomes deterministic | renderer/engine quality result + targeted repair |
| Q1e | Replace full source injection with Stage-adapted summaries / queried slices; remove Claude-plugin and “respond only” instructions | Less conflict and attention dilution; works identically for Claude and Codex | skill adapters + `hifi_prompt_extras` |
| Q2 | Validate Lucide imports vs real exports | Stops one bad icon doubling the run | renderer or engine pre-check |
| Q3 | JSON repair retry on parse fail | Dashboard-type failures | `provider_json.rs` / workflow |
| Q4 | Hi-Fi: no `tsx` ⇒ failure + repair | Signup-shaped misses | normalize / workflow |
| Q5 | R3b vendor motion set only after component-fit recipes demand it | More exports do not improve quality when selection is wrong | vendor script |

### Success metrics (next dump)

- Every scoped Hi-Fi response contains valid, renderable TSX.
- All screens share the same run-level type, color, spacing, radius, elevation, density, and motion vocabulary.
- Relevant screens use a structural/signature component; decorative patterns alone do not count.
- Charts appear for meaningful trends/comparisons, not merely because `stat-strip` exists.
- Motion has a stated interaction purpose and a complete resting frame; high-frequency screens may correctly use no JS motion.
- No signature effect is repeated across most screens when alternatives are available.
- The same fixture criteria pass with Claude and Codex.
- Zero invalid named exports and zero parse-skipped screens.

---

## Progress table

| # | Item | Status | Notes / left off |
|---|------|--------|------------------|
| D1 | Direction doc: real React + Motion + Tailwind + registry libraries | `[x]` | `docs/WIREFRAMES_REAL_REACT_LIBRARIES.md` |
| D2 | Delete old quality plan | `[x]` | `WIREFRAMES_QUALITY_PLAN.md` gone |
| D3 | Delete old session audit (7–9 Aug) | `[x]` | This file replaces it |
| D4 | Link from PROJECT_STATUS / docs/README | `[x]` | P0 wireframes row points here + direction doc |
| D5 | Component inventory (data) | `[x]` | + **React Bits 165** (`REACTBITS_COMPONENTS`) |
| D6 | Firecrawl + registry research | `[x]` | React Bits: site Firecrawl fails; **GitHub `public/r/registry.json` works** |
| D7 | React Bits unblocked | `[x]` | Not blocked anymore |
| — | **Werner agrees on docs → start code** | `[x]` | Approved |
| R1 | Live React preview path | `[x]` | IPC `fetchR2TextRaw` → srcDoc; process stub |
| R2 | Allow `motion/react` on live path | `[x]` | Allowed; **model still rarely uses it** → Q1 |
| R3 | Registry vendor pipeline | `[~]` | Script exists |
| R3a | Vendor static-safe set | `[~]` | Kokonut/Magic/React Bits static-safe |
| R3b | Vendor Motion/live set | `[ ]` | After Q1 |
| R4 | Motion skills drive real output | `[ ]` | Blocked on Q1 |
| R5 | Static capture for Figma only | `[x]` | Two consumers from one TSX |
| Q0 | Debug dump per run | `[x]` | `/tmp/stage-wireframes/<run_id>/` · ON in Electron dev |
| Q1 | Run-level design system + page recipes + final execution contract + quality gate | `[ ]` | **Next** — provider-neutral; component fit, not component count |
| Q2 | Lucide export validation | `[ ]` | Stops `Figma`-style crashes |
| Q3 | JSON parse harden / repair | `[ ]` | Dashboard control-character fails |
| Q4 | Hi-Fi reject outline-only (no tsx) | `[ ]` | Signup MISSING |
| S1 | Re-vendor Taste skill for React | `[ ]` | Skills track |
| S2 | ui-ux-pro-max engine-side CSV lookup | `[ ]` | Skills track |
| S3 | Phase 2 moodboard layout brief | `[ ]` | Later |

---

## Session log

### 2026-08-11 — selected skills + libraries reread (quality plan corrected)

- Read the actual UI UX Pro Max and Emil adapters + upstream sources, plus the exported Kokonut, Magic UI, and Bklit implementations used by run `1f3717f2-…`.
- Rejected the blunt “2–3 showcase components per screen” metric. Correct model: one shared design system, page-specific override, semantically fitting recipes, purposeful motion, and a deterministic post-generation quality gate.
- Found stale adapters (HTML/no React), provider/tool-operating text in injected sources, and a later `REACT_TSX_RULES` contradiction that says static/no JS after the live-Motion rule.
- Confirmed the same prompt builder serves Claude and Codex; the replacement contract is provider-neutral.
- Corrected dump attribution: only two of the four scoped screens produced usable new TSX; merged existing screens are not current-run generation evidence.

### 2026-08-11 — dump diagnosis → quality backlog (this doc)

- Analyzed `/tmp/stage-wireframes/1f3717f2-3831-483a-b46b-873002343493/`.
- **Selected packs ≠ used comps:** Card/Button spam; Magic/Bklit sparse; **zero motion**.
- Failures: bad JSON (dashboard), no tsx (signup), Lucide `Figma` (artifact-connect).
- Added § **Quality diagnosis** + Q1–Q4. Next code: **Q1 prompt pressure**.

### 2026-08-11 — wireframes debug dump (inspect every run)

- **Why:** Werner needs to see exact prompt / model TSX / static+live HTML / R2 keys — console only had counts.
- **What:** `apps/stage-engine/src/wireframes/debug_dump.rs`. Each run writes `/tmp/stage-wireframes/<run_id>/`:
  - `00-meta.json` — packs, skills, screen ids
  - `01-prompt-<screen>.md` — exact prompt to Claude
  - `02-provider-raw-<screen>.txt` — raw model output
  - `03-tsx-<screen>.tsx` — model TSX + log of every `import` line
  - `04-static-*.html` / `05-live-*.html` — both render consumers
  - `06-render-summary.json` — sizes, `liveHasProcessStub`, renderMode
  - `07-artifact-after-offload.json` — `htmlUrl` / `liveUrl` keys
  - `README.md` — how to read the folder
- **On by default** in debug cargo builds and in Electron dev (sidecar sets `STAGE_WIREFRAMES_DEBUG_DUMP=1` when unset). Disable with `STAGE_WIREFRAMES_DEBUG_DUMP=0`. Optional: `STAGE_WIREFRAMES_DEBUG_DIR=/other/path`.
- **Logs:** look for `wireframes debug dump ON`, `wireframes debug model TSX summary`, `wireframes debug render output summary`, `wireframes debug dump complete — open this folder…`.
- **How to use:** regenerate → copy the `path=` from the engine log → open that folder → start with `03-tsx` + `06-render-summary` + `07-artifact-after-offload`.

### 2026-08-11 — bugfix: blank live preview (`process` + R2 fetch)

- **Bug:** full-size dialog opened but body stayed blank white. Two independent breaks:
  1. **Live bundle crashed on `process is not defined`.** esbuild only defined `process.env.NODE_ENV`; vendored code (Kokonut `v0-button`) reads `process.env.VERCEL_PROJECT_PRODUCTION_URL` → ReferenceError → React never mounts → white `#root`. Fix: `banner` declares `var process = { env: { NODE_ENV: "production" } }` before the IIFE + `define: { "process.env": "process.env" }` keeps the identifier alive. Verified against a real esbuild build + run.
  2. **Live iframe loaded R2 directly (`src={liveUrl}`).** Static thumbnails were already fixed to fetch via the main process (`fetchR2Text` → `srcDoc`) because the sandboxed iframe can't fetch the bucket (no CORS / opaque origin) and Cloudflare rewrites HTML responses with an email-decode script. The live path still pointed the iframe straight at R2 → failed/cancelled navigation + "Unsafe attempt to load URL". Fix: dialog now fetches via new `storageFetchR2TextRaw` IPC → `srcDoc` + `sandbox="allow-scripts"`. **Raw variant needed** because `fetchR2Text` strips every `<script>` tag (right for static) — the live bundle *is* a script, so stripping deletes the entire app.
- **Files:** `packages/wireframe-renderer/src/cli.ts` (esbuild banner/define), `apps/user-application/electron/ipc.ts` (`storageFetchR2TextRaw`), `electron/preload.ts`, `shared/ipc/channels.ts`, `src/types/stage-desktop.d.ts`, `src/components/project/tabs/wireframes/WireframeHtmlPreview.tsx` (fetch-then-srcDoc, loading state, fallback to static on error).
- **Verified:** renderer `tsc` clean · smoke 4/4 · UI `tsc` clean. **NOT run by me:** full in-app Electron E2E — confirm by opening a screen full-size.

### 2026-08-11 — coding session (acquisition mechanism + vendor pipeline)

- **Decisions locked (Werner):** R1 = sandboxed live-Motion preview (own origin, no IPC/Convex tokens); build-time vendor script approved; Werner will source reactbits.
- **Acquisition mechanism proven — the recurring open question, now answered:**
  - Discovery = **one index file per registry** (`kokonutui.com/r/registry.json`, `magicui.design/registry.json`). Parsed live: **Kokonut 40** components (9 static-safe, 31 motion), **Magic UI 246** items (~209 no-motion-dep, 31 motion). The index carries `dependencies` → **auto** static-safe vs motion classification; Magic UI even ships `css`/keyframes inline.
  - Source = per component `GET /r/<name>.json` (real code, not docs/markdown, not `npx`).
  - Storage = **build-time snapshot committed to the repo**; renderer stays offline (no runtime cron). Optional manual refresh script.
  - Coverage: Kokonut / Magic UI / cult-ui (429 throttle) / Origin fully fetchable; **Aceternity** paid subset is 401-gated; **reactbits** = Firecrawl blocked but **GitHub registry fully fetchable** (see later log).
  - Final gate is always a **fixture render** (caught e.g. `switch-button` importing `next-themes` despite a clean deps list).
- **Built + ran** `scripts/vendor-registry.mjs`: `GET /r/<name>.json` → reject motion/external deps → adapt `next/*` → merge keyframes into `globals.css` → wire index + `libraries.json`. Reusable now (static set) and after R1 (`--allow-motion` for the motion set).
- **Vendored + fixture-verified (exit 0, no error, renderer `tsc` clean, smoke 4/4):** Kokonut `LiquidGlassCard`+`LiquidButton`; Magic UI `NeonGradientCard`, `RetroGrid`, `Meteors`, `NoiseTexture`, `PulsatingButton`. Magic UI Stage exports 17→22. `v0-button` auto-skipped (default-only export) — the deps/external filter + fixture gate keep bad vendors out.
- **Next phase:** R1 (sandboxed own-origin live-Motion iframe, no IPC/tokens) + R2 (allow `motion` on the live path) → unlocks the 31 motion comps/library; then R3b bulk-vendors them with `--allow-motion`.
- **React Bits wired as a selectable `sections` pack** (extended the vendor script with `react-bits` + PascalCase/default-export handling). Vendored + fixture-verified 7 components (all render visibly under SSR): `StarBorder`, `ElectricBorder`, `GlareHover`, `GlassIcons`, `GlassSurface`, `Folder`, `GradualBlur`. Registered across all surfaces: `cli.ts` LIBRARY_SLOTS, `render.rs` LIBRARY_SLOTS, `prompt.rs` COMPONENT_PACKS (+ minimal `component-packs/react-bits/pack.{css,md}`), `libraries.json`, `src/libraries/react-bits/index.ts`, UI `COMPONENT_PACK_CATALOG` + `public/logos/component-packs/react-bits.svg`. Verified: renderer `tsc` clean, `cargo test wireframes` 58/58, UI `tsc` clean, smoke 4/4.
- **Static-safe breadth batch (script-driven, each fixture-gated, poisoners auto-removed):** Magic UI **17→33** (+Android, ProgressiveBlur, HexagonPattern, StripedPattern, InteractiveGridPattern, AnimatedCircularProgressBar, RippleButton, InteractiveHoverButton, PixelImage, Backlight, MorphingText, NeonGradientCard, RetroGrid, Meteors, NoiseTexture, PulsatingButton); Kokonut **21→25** (+LiquidGlassCard, LiquidButton, CarouselCards, V0Button); React Bits **7**. Rejected by the gate: `file-tree` (@radix-ui/react-accordion), `terminal` (motion/react), `profile-dropdown` (missing @/components/ui/*). Script hardened to strip next/image-only props (`fill`). Verified: renderer `tsc` clean, smoke 4/4, `cargo test wireframes` 58/58, UI `tsc` clean, combined fixture exit 0.
- **R1 + R2 SHIPPED (live Motion).** Renderer: `motion`+`esbuild` deps; new `buildLiveDocument` bundles each screen (React + ReactDOM/client + motion + vendored components, tsconfig-path resolved) into a self-contained HTML doc, emitted as `liveHtml`. Engine: `render.rs` captures it, `offload_rendered_screens` uploads it to R2 (`text/html`) → `liveUrl` (dropped on failure; too big to inline). Contract `liveHtml`/`liveUrl`; Convex resolves `liveUrl`. App: preview dialog runs `liveUrl` in `sandbox="allow-scripts"` (opaque origin — no app/Convex/IPC access); thumbnail + Figma stay static. Prompt allows `motion/react`. **Verified: renderer `tsc`; `cargo build` + `cargo test wireframes` 58/58; data-ops build + convex `tsc`; UI `tsc`; and a real headless-browser load proved motion runs (React mounted, opacity 0→1).** Note: live bundle ~586 KB/screen — a shared runtime is a later optimization. Next: R3b (bulk-vendor the motion set with `--allow-motion`), R4 (motion skills).
- **cult-ui / coss-ui:** placeholder icons saved (`cult-ui.svg`, `coss-ui.svg`), but NOT registered as packs — cult-ui source not yet fetched (registry 429) and is mostly motion (R1); coss-ui is Base UI (not Tailwind) so it does not fit the renderer without a second styling stack. Honest blocker, not skipped silently.

### 2026-08-11 (later)

- React Bits: Firecrawl of `reactbits.dev` still fails; **GitHub works**.
- Indexed `https://raw.githubusercontent.com/DavidHDev/react-bits/main/public/r/registry.json` → 660 items / **165 unique** (prefer `*-TS-TW`).
- Stored as `REACTBITS_REGISTRY` + `REACTBITS_COMPONENTS` in inventory. Declared-deps split ≈41 static-safe / ≈124 need gsap|motion|three|ogl.
- License note: MIT + Commons Clause — review before ship.
- Werner approved sandboxed live-Motion + vendor pipeline → R1 + R3 next.

### 2026-08-11

- Agreed direction: real libraries + live React/Motion, not CSS-only hacks / static-everywhere.
- Wrote `WIREFRAMES_REAL_REACT_LIBRARIES.md` (`!!!`).
- Deleted `WIREFRAMES_QUALITY_PLAN.md`.
- Built inventory in `wireframesQualityInventory.ts` (measured: most Kokonut showcase components need `motion`).
- **Mistake corrected:** inventory ≠ progress audit. This file is the progress audit.
- Deleted outdated `WIREFRAMES_SESSION_AUDIT_2026-08-09.md`.
- **Paused** for Werner OK before coding.

---

## Next (after you agree)

1. **R1** — live React preview architecture (where it mounts, how Figma stays static).
2. **R3a** — vendor static-safe showcase components (Liquid Glass Card first).
3. Update this table as each item moves.

Do not invent parallel plan `.md` files; update this table + the direction doc.
