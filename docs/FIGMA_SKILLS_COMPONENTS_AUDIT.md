# Figma → Skills / Components / Marketplace audit

> **File:** [Stage ↔ Main](https://www.figma.com/design/1r1quTKtqFy9E2UZt3rnOd/Stage-%3C%3E-Main)
> **Nodes:** `1619:231`, `1597:647`, `1597:549`, `1619:291`, `1619:220`, `1619:260`, `1619:267`, `1595:575`, `1654:3948`, `1642:2966`
> **Branch:** `fix/research-stability-wireframes-quality`
> **Last checked:** 2026-07-27 (agent self-audit)

Legend: `[x]` done in code · `[ ]` not done / deferred · `~` partial

---

## Shell / navigation

| Figma item | Status | Notes |
|------------|--------|--------|
| Page lives under Integrations (`/integrations`) | [x] | |
| Compact, content-width pill tabs + icons | [x] | `w-fit self-start`; no full-width gray bar |
| Active tab gradient (purple) | [x] | `from-[#8D87FF] to-[#7B76DF]` |
| Header title + supporting description | [x] | |
| Refresh on Tools only | [x] | |

## Skills tab (`1619:231`)

| Figma item | Status | Notes |
|------------|--------|--------|
| “Installed Skills” + installed/active counts | [x] | |
| 2-column skill cards | [x] | |
| Mesh header + centered `<Title>` overlay | [x] | |
| Phone icon + toggle row | [x] | `phone.svg` |
| Official badge + description | [x] | |
| Installed list comes only from Stage’s curated catalog | [x] | No `~/.agents` / `~/.claude` scan |
| Add Skill moves item into Installed Skills | [x] | Persists `installedSkillIds` in Convex |

## Components tab (`1597:647`)

| Figma item | Status | Notes |
|------------|--------|--------|
| Gray shell with title + counts inside header | [x] | `12 installed · 5 enabled` |
| Separate white rounded rows with 4 px gutters | [x] | |
| Real pack logos | [x] | shadcn jpg + SVGs you exported |
| Official badge + toggle | [x] | |
| Figma row height and 40 × 22 px toggles | [x] | |
| Aceternity logo | ~ | Placeholder mark — your Aceternity export was not in Downloads |

## Marketplace tab (`1619:291`, `1619:220`, `1595:575`)

| Figma item | Status | Notes |
|------------|--------|--------|
| Sub-tabs Skills / Component Libraries | [x] | |
| Search (local filter) | [x] | No skills.sh network fetch |
| Discover Skills — curated list (Werner) | [x] | taste, frontend-design, impeccable, etc. |
| + Add Skill → Stage installed state | [x] | No filesystem install or scan |
| Discover cards use gray shell + tight 2-column grid | [x] | Odd final card spans both columns |
| Discover Components — Stage packs only | [x] | + Add Library enables prompt pack |
| Skill artwork/body proportions match Figma | [x] | 120 px artwork; aligned card bodies |
| Library cards use vertical icon/title hierarchy | [x] | 190 px card height |
| Library install counts use verified skills.sh values | [x] | Static snapshot; unavailable direct listings are labeled, never fabricated |

## Installed Skills

| Item | Status | Notes |
|------|--------|--------|
| Curated Stage list only | [x] | Exactly the Marketplace skill catalog |
| Toggle enable for Hi-Fi prefs | [x] | |

## Explicitly removed

| Item | Status |
|------|--------|
| Fetch / load from skills.sh API | removed |
| Scan `~/.agents/skills` / `~/.claude/skills` | removed |
| Electron skills scanner / installer IPC | removed |
| Fake SaaS Landing / Dashboard Density catalog | removed |

## Assets

| Asset | Status | Path |
|-------|--------|------|
| toolbox / magic-wand / blocks / shopping-bag | [x] | `public/logos/skills/*.svg` |
| phone | [x] | `public/logos/skills/phone.svg` |
| Pack logos (shadcn, radix, magic, kokonut, origin, mantine) | [x] | `public/logos/component-packs/` |
| Meshes warm/green/cool | [x] | `public/images/skills/` |

## Engine / prefs

| Item | Status |
|------|--------|
| Convex prefs + Hi-Fi pack/taste wiring | [x] |
| Hi-Fi precedence: project selection → built-in Design Taste + default packs | [x] | empty project is caller-independent |
| Every catalog skill injects a full vendored `SKILL.md`, not a one-line hint | [x] | `apps/stage-engine/skills/<id>/SKILL.md` |
| Verbatim upstream kept beside each adapted skill for provenance | [x] | `SOURCE_*.md` in the same directory |
| `<skill_precedence>` emitted when 2+ skills are active; Taste injected last | [x] | |
| Lo-Fi ignores skills and packs | [x] |
| Component libraries ship real vendored CSS, not one-line prompt hints | [x] | `apps/stage-engine/component-packs/<id>/pack.css` + `pack.md`; `COMPONENT_PACK_HINTS` deleted |
| All 4 base packs implement an identical `ui-*` class set | [x] | Verified by selector diff against the shadcn reference — 0 missing, 0 extra |
| Sections packs never restyle a control | [x] | Verified: no `ui-*` rule declared in either sections pack |
| Pack stylesheet rides inside each Hi-Fi fragment | [x] | Preview, PNG, Paper, and code export each take one fragment and cannot reach run-level state |
| Hi-Fi validation runs before the pack CSS is attached | [x] | Otherwise any fragment would satisfy the "must be styled" check |
| A sections pack always gets a base pack under it | [x] | Legacy selections could name sections only, leaving `--ui-*` undefined |
| `radix-ui` never reaches a run | [x] | Behaviour, not a visual design — absent from `COMPONENT_PACKS` |

## Create flow — Skills & Components (`1654:3948`)

| Figma item | Status | Notes |
|------------|--------|--------|
| Step between Timeline and Roadmap | [x] | `create/SkillsComponentsStep.tsx` |
| Title + "Select skills and components to use in this project" | [x] | |
| Skills multi-select with removable chips | [x] | `CatalogMultiSelect` |
| Components multi-select with pack logos | [x] | Same control; chips carry the pack logo |
| Full-width gradient Continue button | [x] | Reuses `ContinueButton` |
| Progress bar | ~ | Figma draws 5 segments; the flow now has 6 steps, so the bar renders 6 |
| Selection persisted on the project | [x] | `projects.skillIds` / `projects.componentPackIds` |
| Edit later from the project ⋯ menu | [x] | "Edit Skills & Components" modal |

## Skill detail (`1642:2966`)

| Figma item | Status | Notes |
|------------|--------|--------|
| Back to libraries, title, tagline, Use in Stage | [x] | `settings/SkillDetailPanel.tsx` |
| Hero artwork | ~ | Single mesh per skill — the 5-dot carousel needs 5 real assets |
| Description / Features & Use Cases / Best for | [x] | Content added to `skillsCatalog.ts` |
| Meta rail (Price, Works with, Category, Source, Author, Popularity, Tags) | [x] | |
| Meta rail — Links | [x] | Verified upstream repository URL per skill (`sourceUrl`) |
| Meta rail — Status "Verified skill", Last updated | [ ] | No per-skill update dates; omitted rather than invented |
| Similar Skills rows with Add Skill | [x] | Rows open that skill's detail |
| Videos section | [ ] | No video assets exist |
| Purple "Want this look in your own product?" banner | [x] | |
| Share modal + Copy Link → green Copied | [x] | |
| "Skill added to your library" toast | [x] | Reuses the Marketplace toast |
| Visitor "Add {Skill} to your workflow" signup modal | [ ] | No unauthenticated route reaches this panel in the desktop app |

## Deferred

| Item | Status |
|------|--------|
| Exact Aceternity brand mark from your export | [ ] Drop file → replace placeholder |

---

## Self-check log

| Date | Result |
|------|--------|
| 2026-07-21 | First pass used underline tabs — **wrong** vs Stage pill pattern |
| 2026-07-21 | Rework: SettingsShell pill tabs + icons, skill cards, pack logos, marketplace discover |
| 2026-07-22 | **Pass:** local scan removed; curated install state added; Components and Marketplace rebuilt against supplied Figma frames |
| 2026-07-22 | Detail pass for nodes `1619:267`, `1619:260`, `1597:549`: corrected card hierarchy, proportions, row spacing, and toggles |
| 2026-07-22 | Replaced repeated `19.2K` Figma placeholder values with verified skills.sh counts; Kokonut UI and Origin UI have no direct listing |
| 2026-07-27 | Per-project skills shipped: create step (`1654:3948`), ⋯ edit modal, Hi-Fi precedence, `<skills>` prompt block, Skill detail page (`1642:2966`). Verified: 3 × tsc, `electron-vite build`, `cargo test` (164 passed) |
| 2026-07-27 | Vendored the real upstream skills (Anthropic frontend-design, nextlevelbuilder ui-ux-pro-max, pbakaus impeccable, emilkowalski design-eng, kylezantos motion, shadcn/ui). Each has a verbatim `SOURCE_*.md` plus a Stage-adapted `SKILL.md`; the one-line hints are gone. Corrected two wrong authors (motion → kylezantos, shadcn → shadcn). Verified: `cargo test` 165 passed, 3 × tsc, `electron-vite build` |
