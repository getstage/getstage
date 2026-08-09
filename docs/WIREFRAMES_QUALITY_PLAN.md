# Wireframes quality plan — beat raw Claude

> **Goal:** Make Stage’s wireframe output clearly better than the same brief prompted by hand in Claude — same model, better packaging (skills + pipeline context + library packs).  
> **Last updated:** 2026-07-15  
> **Related:** [`apps/user-application/docs/AI/wireframes/WIREFRAMES_BUILD_PLAN.md`](../apps/user-application/docs/AI/wireframes/WIREFRAMES_BUILD_PLAN.md) (shipping architecture) · engine `apps/stage-engine/src/wireframes/` · testing audit `docs/TESTING_AUDIT_2026-07-15.md`

---

## Implementation status (2026-07-21)

> **Newer:** the React/Tailwind pipeline landed 7–9 Aug 2026 and changed several rows below
> (the `pack.css` component packs no longer apply to Hi-Fi React runs). Current state and
> open items: [`WIREFRAMES_SESSION_AUDIT_2026-08-09.md`](WIREFRAMES_SESSION_AUDIT_2026-08-09.md).

| Item | Status | Where |
|------|--------|--------|
| Phase 1 Taste skill on Hi-Fi generate | **In engine (testable)** | `apps/stage-engine/skills/design-taste-frontend/SKILL.md` injected by `wireframes/prompt.rs` (source: Leonxlnx/taste-skill / tasteskill.dev) |
| A/B without skill | **Ready** | `STAGE_WIREFRAMES_TASTE_SKILL=0` on stage-engine (overrides user prefs) |
| Whitespace / content-height preview | **In code** | `shared/wireframePreviewDocument.ts` + `ResultsGrid` top-align |
| Figma export hug content / drop full white plates | **In code** | `electron/helpers/wireframe-screenshot.ts` + `figma-exporter` |
| Hi-Fi prompt bans `100vh` empty shells | **In code** | `HIFI_RULES` in `prompt.rs` |
| Prod console: no Convex URL leak | **In code** | `src/lib/convex.ts` DEV-only log |
| Integrations hub: Skills / Components / Marketplace UI | **In code** | `/integrations` tabs + `SkillsComponentsHub.tsx` · Figma audit `docs/FIGMA_SKILLS_COMPONENTS_AUDIT.md` |
| User prefs for skills + component packs | **In code** | Convex `users.enabledSkillIds` / `enabledComponentPackIds` → `getWireframesInput` |
| Hi-Fi prompt respects skill + pack toggles | **In code** | `wireframes/prompt.rs` |
| Scoped runs drop research + filter flows | **In code** | `wireframes/prompt.rs` — a scoped re-design no longer carries the full research dump |
| One provider call per screen, run in parallel | **In code** | `wireframes/workflow.rs` `run_screens_in_parallel`, max 4 at a time |
| Malformed artifact no longer loses the run | **In code** | `helpers/provider_json.rs` recovers the complete screens when the root JSON breaks |
| Partial results are saved, not discarded | **In code** | `wireframes/normalize.rs` reverts only the failed screens and reports them |
| Engine run timings + scope in logs | **In code** | `wireframes/workflow.rs` phase timings, `prompt_chars`, provider heartbeat |
| Local skill scan / per-project picker (Phases 3–4 full) | **Not started** | Deferred — see audit “Deferred” |
| Phase 2 moodboard layout brief | **Not started** | After Phase 1 proof |

**Figma design audit:** [`docs/FIGMA_SKILLS_COMPONENTS_AUDIT.md`](FIGMA_SKILLS_COMPONENTS_AUDIT.md) — agent self-checks shipped UI against nodes `1574:52` / `1598:698` / `1629:1853`.

**Rule for design:** Skill / Components hub shipped early for prefs + prompt wiring; still prove Phase 1 A/B before expanding marketplace install.

---

## Phase 1 test protocol (before designer work)

Goal: same project brief → Stage Hi-Fi **with** Taste vs **without** (and optionally vs hand Claude + tasteskill.dev).

### Setup
1. Rebuild / restart **stage-engine** + desktop so prompt + preview changes load.
2. Use one fixed project (strategy + moodboard already saved). Prefer **testing** Convex.
3. Skill used: Stage-adapted `design-taste-frontend` (from `npx skills add Leonxlnx/taste-skill`).

### Run A — with Taste (default)
1. Ensure `STAGE_WIREFRAMES_TASTE_SKILL` is unset or `1`.
2. Generate **Hi-Fi** wireframes.
3. Save screenshots of 3 screens: marketing, auth/onboarding modal, one product screen.
4. Export one screen to Figma; check frame height hugs content (no giant empty band).

### Run B — without Taste (control)
1. Restart engine with `STAGE_WIREFRAMES_TASTE_SKILL=0`.
2. Regenerate Hi-Fi on the **same** project / same screen set.
3. Same 3 screenshots + one Figma export.

### Pass criteria (Phase 1 “done when”)
- [ ] With-skill set looks clearly less “AI default” (no purple-slop / empty 100vh modals / identical card grids) than without-skill
- [ ] Modal/onboarding screens are **content-sized** in Stage cards (no tiny box in a white void)
- [ ] Figma frame for a modal is roughly content height, not a tall empty canvas
- [ ] Wessel + Adrien agree “skills path is right” **before** Skill page design starts

### Out of this test
- Designer Skill page / per-project toggles (Phase 3–4)
- Moodboard layout brief extraction (Phase 2)
- Full library / component packs

---

## Thesis

Raw Claude wins today because the user loads a **Taste skill** and chats with full intent. Stage uses the **same local Claude / Codex CLI** but sends a thinner package: raw artifact JSON dumps + a few hardcoded Hi-Fi “anti-slop” rules — **no skills attached**. Same binary ≠ skills auto-load.

Every gap is packaging we control: attach skills from the user’s agent folders, ship a default Taste skill + curated library (including free component packs), and turn pipeline data into a brief the model must follow — especially **moodboard layout patterns**, not only tokens.

---

## What Stage does today vs what we want

| Area | Today | Want |
|------|--------|------|
| Model | Claude / Codex CLI (same as raw Claude) | Keep — improve packaging, not swap models |
| Taste / design skill | Thin `HIFI_RULES` anti-slop text in `prompt.rs` | Default Taste skill always on for Hi-Fi |
| Moodboard | Full JSON dumped; Hi-Fi told to use `styleGuides[]` **tokens** (look) | Tokens **and** extracted **layout / composition patterns** |
| Research / strategy / flows | Raw JSON dumps | Compact must-follow brief sections |
| User skills | Not attached on wireframe runs | Scan `.claude` / `.codex` / `.agents` → toggle → attach on run |
| Skill UI | None | Skill page + skill icon on project pages (design) |
| Library / components | None | Curated in-app library + free component packs (start OSS) |
| Per-project skills | None | Project A ≠ Project B skill sets |
| Refine | Regen selected whole screens | Nudge section / constraints; keep set consistent |

### Moodboard: tokens vs patterns (Adrien / user asks)

| Already mostly there (“the look”) | Still missing (“moodboard patterns”) |
|-----------------------------------|--------------------------------------|
| Design tokens from style guide / brand kit (color, type, spacing, radius, shadow) | Layout / composition patterns from the moodboard direction |

Example tokens: “purple buttons, Inter, 8px radius.”  
Example patterns: “split hero left + image right → 3 feature cards → sticky CTA” — taken from moodboard references, not invented cold.

Users asked (×3) for the **layout** side. That is Phase 2’s critical gap — separate from Taste skill (Phase 1).

---

## Current architecture (baseline)

```txt
WireframesTab → IPC startRun(mode: wireframes)
  → stage-engine wireframes/workflow.rs
       → Convex getWireframesInput
            Strategy (required)
            Research / Moodboard / Flows / existing wireframes (optional)
       → build_wireframes_prompt()  // prompt.rs
            pastes full artifact JSON blobs
            + schema / cognitive steps
            + HIFI_RULES (inline anti-slop; not a skill)
       → Claude / Codex CLI (no skills from .claude / .codex / .agents attached)
       → normalize → save wireframesArtifact
```

Target run shape:

```txt
User skills (.claude / .codex / .agents)
  + Stage default Taste skill
  + Library / component packs (enabled)
  + Structured brief (tokens + moodboard layouts + research + flows)
  → Claude / Codex wireframe run
```

---

## Phase 1 — Bake in a default taste skill

**What:** Ship one strong, curated taste/design skill with Stage. Invoke it automatically on every wireframe (especially Hi-Fi) generation. On for everyone, zero config.

**Why:** Biggest reason raw Claude wins. Users with empty skill folders still get a strong baseline. Validates the thesis before heavier product surface.

**Implemented for testing (2026-07-15):**
- Skill path: `apps/stage-engine/skills/design-taste-frontend/SKILL.md` (adapted from Leonxlnx/taste-skill `design-taste-frontend`)
- Wired in: `build_wireframes_prompt()` → Hi-Fi only
- Disable for control: `STAGE_WIREFRAMES_TASTE_SKILL=0`
- Follow **Phase 1 test protocol** above before any Skill UI design

**Likely touch points (later productization):**
- Bundle skill with desktop / engine release artifacts
- Claude / Codex provider invoke path — attach / allow the skill for wireframes runs (today: prompt inject; CLI skill folders are not assumed)
- Skill page UI only after A/B pass

**Done when:** A generated Hi-Fi wireframe from Stage looks as good as, or better than, the same brief prompted by hand in Claude with a taste skill — and the test checklist above is checked.

---

## Phase 2 — Structured design brief (incl. moodboard layouts)

**What:** Stop relying on fat JSON alone. Assemble a brief the wireframe step **must** consume:

1. **Design tokens** — from selected moodboard style guide or brand kit (look — largely already promptable today)
2. **Research patterns** — competitor patterns as explicit rules (e.g. social proof on login, sticky pricing)
3. **Moodboard layout patterns** — structure / section rhythm / composition from the selected direction (**the real gap**)
4. **Flow context** — screens stay consistent with each other and the journey

**Practical moodboard-layout fix:**
1. From the selected moodboard direction, build a short list of layout rules (e.g. “Homepage: split hero; Features: 3-up cards; Pricing: sticky CTA”)
2. Put that in the wireframe prompt as a must-follow section (not buried in fat JSON)
3. Optionally attach 1–2 moodboard reference images so the model can copy composition

**Why:** Pipeline moat. Stage already has the data; underuses it for *how* screens are built.

**Likely touch points:**
- Brief builder (engine): distill Convex artifacts → compact structured sections
- `wireframes/prompt.rs` — wrap / replace raw dumps with the brief
- Possibly Convex-side pre-extraction if payloads are too large

**Done when:** Wireframes visibly reflect research patterns, moodboard **layouts**, tokens, and flow consistency across screens.

---

## Phase 3 — Import the user’s local skills

**What:** Stage already runs local Claude / Codex. Scan skills the user already has and surface them with on/off toggles. **Attach enabled skills on the wireframe run** — do not assume headless CLI loads them automatically.

**Skill sources (discover):**
- `~/.claude/skills` and project `.claude/skills`
- Codex-equivalent skill / agent dirs (`.codex` where applicable)
- Project / user `.agents/skills`

**Why:** Native-Mac differentiator. “The app that uses your own Claude / Codex / agent skills.” Foundation for per-project selection.

**Design:** Skill page + skill icon on project pages (designer).

**Likely touch points:**
- Engine or Electron scan of the skill dirs above
- Settings / Integrations or dedicated Skill page — list + toggles
- Persist enabled skill IDs (user defaults first; project override in Phase 4)
- Pass enabled skills into the wireframes provider run

**Done when:** A user with skills installed sees them in Stage, can toggle which apply, and the next generation actually uses the enabled set.

---

## Phase 4 — Per-project skill selection + curated library (+ component packs)

**What:**
- Each project picks its own skill set (e.g. chart-components on for a design-tool project, off for a landing page)
- Ship a curated in-app library (Taste and peers curated from GitHub) so users with no local skills still get a strong menu
- **Component library packs** (start with free / OSS collections such as KokonutUI-style packs): treat as generation inputs Stage applies — patterns / components that make Hi-Fi next-level — **not** reselling OSS as a paid download of free software

**Why:** Skills are project-specific. Library + packs fix the no-skills wedge and are a content surface (“best skills / components, built into Stage”). Monetize Stage generation quality later if needed — not “buy this free library inside Stage.”

**Design:** Project skill picker on the Skill page; library browse / enable.

**Likely touch points:**
- Convex / project settings: `enabledSkillIds[]` (and pack IDs) per project
- In-app skill + component pack store (install/copy into Stage skill store)
- Wireframes configure / Skill page: project picker

**Done when:** Skills (and packs) are saved per project; enabling a library skill or component pack visibly affects the next generation.

---

## Phase 5 — Refine loop + consistency polish

**What:** Tighten per-screen regenerate/refine (“redo this section,” “tighten spacing,” “match screen 2”) and enforce cross-screen consistency.

**Why:** One-shot always feels worse than Claude’s conversational iteration. Beating Claude on iteration keeps people in Stage.

**Design:** Ask design to explore the refine UX in parallel (nudge one screen / section without full regen; consistency of the set). Ship after skills + library attach for real.

**Likely touch points:**
- Extend partial regen beyond “redesign whole screen” to section / constraint prompts
- Consistency pass: shared tokens, repeated components, nav chrome across `generatedScreens`
- UI affordances on Wireframes results

**Done when:** User can nudge a single screen without regenerating everything, and screens stay visually consistent as a set.

---

## Suggested build order

| Order | Phase | Effort | Impact | Notes |
|------:|-------|--------|--------|-------|
| 1 | Default taste skill | S | Highest | Ship early; no Skill page required |
| 2 | Local skill import + attach + Skill page | M | Differentiator | `.claude` / `.codex` / `.agents` |
| 3 | Per-project + curated library + free component packs | L | Retention / wedge | Designer: Skill page / icon |
| 4 | Structured design brief (esp. moodboard layouts) | M | Moat / user asks | Can overlap with 2–3 |
| 5 | Refine + consistency | M–L | Stickiness | Designer explores UX in parallel; ship last |

Product intent: skills from the user’s folders + library / component packs are first-class — not optional side quests. Default Taste skill unblocks quality immediately; Skill page unlocks user control; moodboard layouts close the reported user gap; refine keeps people in Stage.

---

## Product decisions (aligned)

- **Same CLI, attach skills explicitly** — Stage must pass enabled skills into the run.
- **Skill page + icon** — yes; designer owns the surface for Phases 3–4 (and refine UX exploration for Phase 5).
- **Component libraries** — yes; start free / OSS as generation packs. Do not sell free OSS as the product.
- **Moodboard** — keep tokens; add layout patterns (user gap).

---

## Out of scope (for this plan)

- Replacing Claude/Codex with a different model
- Refero-in-wireframes layout retrieval (see build plan Phase 6+)
- Figma export quality (separate assets track)

---

## Acceptance snapshot

| Check | Owner |
|-------|--------|
| Side-by-side: Stage Hi-Fi vs hand Claude + Taste on same brief | Phase 1 |
| Tokens **and** moodboard layouts / research / flows visibly present | Phase 2 |
| Local skills from `.claude` / `.codex` / `.agents` listed, toggleable, and attached on run | Phase 3 |
| Project A ≠ Project B skill sets; library skill / component pack affects next generation | Phase 4 |
| Single-screen / section nudge without full regen; set stays consistent | Phase 5 |
