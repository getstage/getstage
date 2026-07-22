# Figma → Skills / Components / Marketplace audit

> **File:** [Stage ↔ Main](https://www.figma.com/design/1r1quTKtqFy9E2UZt3rnOd/Stage-%3C%3E-Main)  
> **Nodes:** `1619:231`, `1597:647`, `1597:549`, `1619:291`, `1619:220`, `1619:260`, `1619:267`, `1595:575`  
> **Branch:** `feat/wireframes-quality`  
> **Last checked:** 2026-07-22 (agent self-audit)

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

## Deferred

| Item | Status |
|------|--------|
| Exact Aceternity brand mark from your export | [ ] Drop file → replace placeholder |
| Per-project skill picker | [ ] |

---

## Self-check log

| Date | Result |
|------|--------|
| 2026-07-21 | First pass used underline tabs — **wrong** vs Stage pill pattern |
| 2026-07-21 | Rework: SettingsShell pill tabs + icons, skill cards, pack logos, marketplace discover |
| 2026-07-22 | **Pass:** local scan removed; curated install state added; Components and Marketplace rebuilt against supplied Figma frames |
| 2026-07-22 | Detail pass for nodes `1619:267`, `1619:260`, `1597:549`: corrected card hierarchy, proportions, row spacing, and toggles |
| 2026-07-22 | Replaced repeated `19.2K` Figma placeholder values with verified skills.sh counts; Kokonut UI and Origin UI have no direct listing |
