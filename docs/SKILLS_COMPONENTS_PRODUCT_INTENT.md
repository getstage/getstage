# Skills + Components — Product Intent (Handoff)

Status: **source of truth**. Read before touching Skills / Components / Hi-Fi generation.

Branch / PR: `fix/research-stability-wireframes-quality` → PR against `work` (`https://github.com/getstage/getstage/pull/73`).

> **Revised 2026-07-27.** Two decisions replaced the earlier model:
> 1. Skills are **not** freely stackable → **one skill per category**.
> 2. Component libraries go to **Option C** (real components rendered), not prompt hints.
> Any older text claiming "mixing is allowed" or "multi-select stays" is superseded.

---

## 1. Goal

A user picks **one design skill**, optionally **one motion skill**, and **one component library**. Hi-Fi output visibly follows all of them: the skill decides the craft, the library supplies the actual components.

---

## 2. Mental model

| Layer | Rule | Decides |
|---|---|---|
| **Design skill** | exactly 1 | How it looks — craft, hierarchy, restraint, anti-slop |
| **Motion skill** | 0 or 1 | How it moves / implies motion |
| **Base system** | exactly 1 | What controls are built from — button, input, card, table |
| **Sections** | 0 or 1 | Page-level blocks — hero, bento, pricing, CTA |

**Skills within one category conflict.** Taste + Frontend Design + UI UX Pro Max stacked together produces mush: three sets of craft rules fighting for the same decisions. That is why selection is *one per category*, not a free multi-select.

**Different categories compose.** A motion skill (Emil / Kylezantos) operates on a different axis than a base design skill, so it layers cleanly. Library is a third axis.

Valid: `Taste + Emil motion + shadcn` · `Frontend Design + shadcn` · `Impeccable + Magic UI`
Invalid: `Taste + Frontend Design` (two base design skills)

---

## 3. Categories

The `category` field on skills and a new `packKind` field on packs become the **exclusivity keys**.

### Skills

| Category | Members | Selection |
|---|---|---|
| **Design** | `design-taste-frontend` (default), `frontend-design`, `ui-ux-pro-max`, `impeccable` | pick 1 |
| **Motion** | `design-motion-principles`, `emil-design-eng` | pick 0–1 |

### Component libraries

The seven libraries are not the same kind of thing, so the same rule applies to them.

| `packKind` | Members | Selection | Supplies |
|---|---|---|---|
| **base** | `shadcn-ui` (default), `mantine`, `origin-ui`, `kokonut-ui` | pick 1 | `ui-*` controls |
| **sections** | `aceternity-ui`, `magic-ui` | pick 0–1 | `sx-*` page sections |
| **primitives** | `radix-ui` | never offered | nothing visual |

Two base systems fight over what a button is, exactly like two design skills. A base pack and a sections pack sit on different axes and compose: an Aceternity hero whose CTA is a shadcn button.

`radix-ui` ships accessible behaviour, not a visual design. It stays visible in the Integrations Components tab for Figma parity but is never selectable for a run — there is nothing for a wireframe to copy.

### Catalog corrections required

- **`emil-design-eng` moves `Design` → `Motion`.** Its upstream is roughly half Framer Motion springs, and product intent treats Emil as the animation skill.
- **`shadcn-ui-skill` is retired** from both the skill catalog and `CATALOG_SKILLS`. Once the shadcn *pack* ships real component CSS, a skill that only describes token discipline is redundant and collides by name with the pack. Removing it from the engine too keeps a legacy saved id from silently affecting a run the user can no longer see or edit.
- Packs previously all carried `category: "SaaS"`, which meant nothing. `packKind` replaces it as the meaningful axis.

---

## 4. Flow

1. **Integrations / Marketplace** — catalog + personal library (browse, add, toggle).
2. **Create project** — Skills & Components step: one Design skill, optional Motion skill, one library.
3. **Project ⋯** — edit that selection later.
4. **Hi-Fi Configure** — must display the active Design skill, Motion skill, and library, with an **Edit** button, before Generate.
5. **Generate** — uses exactly the project selection.
6. **Empty selection** — Stage defaults, identical for every collaborator.
7. **Lo-Fi** — ignores skills and libraries entirely.

### Precedence (locked)

1. Non-empty project `skillIds` / `componentPackIds` → use those.
2. Empty / unset → Stage built-ins: skill `design-taste-frontend`, library `shadcn-ui`.
3. **Never** fall back to the caller's account prefs — that made one unchanged project generate differently per editor. Already fixed in `getWireframesInputHandler`.

---

## 5. Component packs — the decision

### What was chosen

**Real vendored CSS packs, not a React render pipeline.** Option C (real React + Tailwind + SSR) is deferred, not rejected — see the end of this section.

### The problem packs actually solve

`HIFI_RULES` asks the model, in prose, for *"one spacing scale, one corner radius, consistent shadows."* But each of the 13 screens is generated as an independent fragment with its own `<style>` block. Screen 1's button and screen 7's button are two separate inventions.

No prompt fixes this. You cannot ask 13 independent generations to converge on the same button — they have to **share** one.

A component library, functionally, is a fixed set of classes every screen uses. So that is what a pack is.

### Shape

```
apps/stage-engine/component-packs/<pack-id>/
  pack.css   # prepended to every Hi-Fi fragment; never shown to the model
  pack.md    # injected into the prompt; never shipped to the browser
```

- **Class names are stable across packs of the same kind.** Every base pack implements the same `ui-*` list; only the values differ. Swapping shadcn → Mantine swaps CSS without changing a word of the prompt.
- **Colour, type, and radius come from `--ui-*` variables** on `:root`, so the moodboard or brand kit skins any pack. The pack owns proportion; the brand owns skin.
- **Sections packs never restyle controls.** They own layout, section backgrounds, and typographic scale; controls come from the base pack loaded alongside.
- Base CSS is injected before sections CSS, by `COMPONENT_PACKS` order rather than user selection order, because sections consume the base pack's variables.

### Why the CSS rides inside each fragment

The stylesheet is prepended per screen rather than stored once per artifact. Four consumers each receive a **single fragment** and none can reach run-level state: the preview iframe (`buildWireframePreviewDocument`), the PNG capture, Paper's CSS inliner, and the code export. Threading a second value through all four would add coupling and a silent-failure mode where one consumer renders unstyled.

Cost is a few KB of duplication per screen. That buys a fragment that renders anywhere.

Validation order matters: `validate_hifi_html` runs on the model's own markup **before** the pack CSS is attached. Attaching first would let any fragment satisfy the "must be styled" check.

### Deferred: Option C (real React + SSR)

The design still works and stays available. Model emits `Screen.tsx` → Tailwind CLI compiles → `renderToStaticMarkup` → the same static fragment. Figma export walks the rendered DOM, so it never cares where the HTML came from.

What Option C buys that CSS packs do not: **a real code export.** Today `create_code_export` emits `index.html` plus a README saying *"Open `index.html` in a browser"* — not a developer deliverable. Option C turns it into real component source.

What it costs: a node toolchain in the generation path, build latency, a TSX repair loop, and **risk to the Paper export** — `inline_styles_for_paper` folds `<style>` rules onto elements, and compiled Tailwind is thousands of utility rules rather than a handful.

So Option C is a business decision about whether Stage sells code, not a fix for wireframe quality. The pack work is a stepping stone toward it, not a detour: once every screen composes from a fixed vocabulary, mapping that vocabulary to real components is mechanical.

---

## 6. Status

**Done**

- Integrations Marketplace / Skills / Components hub, skill detail page
- Create-project Skills & Components step; project ⋯ edit modal
- Project fields `skillIds` / `componentPackIds`; engine reads project selection
- Empty project → Stage defaults, caller-independent
- Vendored Stage-adapted `SKILL.md` + upstream `SOURCE_*.md`; full skill bodies injected into Hi-Fi
- `<skill_precedence>` block; Taste injected last

**Not done, in order**

| Priority | Work |
|---|---|
| **P0** | Category selection: one Design skill, optional Motion skill, one library. Recategorize Emil → Motion; retire `shadcn-ui-skill`. Touches `skillsCatalog.ts`, `SkillsComponentsSelect.tsx`, `SkillsComponentsStep.tsx`, `ProjectHeaderModals.tsx`, and `resolve_hifi_prompt_preferences` in `prompt.rs`. |
| **P0** | Show the active selection on Hi-Fi Configure with Edit. `ConfigureStep.tsx`, `WireframesTab.tsx`, `ProjectDetailView.tsx` (holds the ids today but never passes them down). |
| **P1** | Option C phase C1 — shadcn render kit, with HTML fallback. |
| **P2** | Copy: skill = guidelines, library = the kit, empty = Stage defaults. |
| **P3** | Additional pack kits; refine loop. |

---

## 7. Non-goals

- No free multi-select of skills within a category.
- No caller-dependent Hi-Fi preferences.
- No live React inside the preview iframe — static render only.
- No invented Figma content (videos, dates, visitor-only flows).
- Keep diffs lean; no speculative abstraction layers.

---

## 8. Success criteria

1. Selection reads as one Design skill, optional Motion skill, one library — never a soup of overlapping skills.
2. That selection is visible on the Hi-Fi Configure screen and editable there.
3. Generated Hi-Fi carries both the skill's craft and the library's real components.
4. Swapping only the library visibly changes the component vocabulary.
5. Swapping only the design skill visibly changes the craft, not the components.
6. Empty selection yields identical Stage defaults for every collaborator.

If a reviewer cannot tell which library produced a screen, Option C is not done.
