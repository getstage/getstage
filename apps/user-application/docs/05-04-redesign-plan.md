# Desktop Dashboard Redesign — Implementation Plan

Date: 2026-05-04
Author: Claude Opus 4.6
Status: **Dashboard redesign COMPLETE — Phases 0-5 done**

Current follow-up scope, added 2026-05-04:

- Continue visual migration from `app/` to `desktop/` with mock data only.
- Do not wire Convex/backend/native features during this UI pass.
- Do not move onboarding into desktop.
- Add project, settings, integrations, and companion-related desktop screens so the design surface exists before architecture decisions.

Reference: `desktop/03-05-desktop-app-plan.md` (original desktop plan)
Tracker: `desktop/03-05-desktop-build-tracker.md` (existing build progress)

---

## Context

The desktop Electron app (`desktop/src/`) was built as a rough structural placeholder using vanilla CSS, unicode icons, and hardcoded mock data. The web app (`app/src/components/`) is the production-quality reference with Tailwind CSS v4, SVG icons, proper design tokens, and polished components. The goal is visual parity between the two — starting with the dashboard, then project/settings pages later.

**The companion UI (`desktop/src/companion/`) is NOT part of this redesign and must remain untouched.**

### Web App Design Reference (source of truth)

- **CSS framework:** Tailwind CSS v4 via `@tailwindcss/vite` plugin
- **Design tokens:** `app/src/styles/globals.css` — `@theme` block with colors, fonts
- **Key colors:** accent `#8782F5`, bg `#f5f5f5`, text `#0a0a0a`, secondary text `#737373`, border `#e5e5e5`
- **Typography:** DM Sans (body), SF Pro Display (headings)
- **Icons:** 23 SVGs in `app/public/logos/dashboard/`
- **Component library:** Radix UI primitives, Framer Motion (`motion` package)
- **Layout:** `AppLayout` — flex with collapsible sidebar (240px/60px) + scrollable content

### Desktop Current State (before redesign)

- Vanilla CSS (`desktop/src/styles/desktop.css`, 510 lines)
- Unicode icons (`⌂`, `■`, `✓`, `●`)
- Hardcoded text ("Pratik Singh")
- Simple CSS bar chart
- Basic task panels with no project avatars or computed urgency

---

## Phase 0: Tailwind CSS v4 Infrastructure

**Goal:** Establish the styling system without breaking existing companion UI.

| Action | File | Details |
|--------|------|---------|
| Install deps | `desktop/package.json` | Add `@tailwindcss/vite`, `tailwindcss`, `clsx`, `tailwind-merge`, `motion` |
| Integrate plugin | `desktop/electron.vite.config.ts` | Add `tailwindcss()` to `renderer.plugins` array |
| Add DM Sans font | `desktop/index.html` | Google Fonts link in `<head>` |
| Create globals | `desktop/src/styles/globals.css` | Port from `app/src/styles/globals.css` — `@import "tailwindcss"`, `@theme` block with all design tokens |
| Update CSS imports | `desktop/src/main.tsx` | Import `globals.css` first, then `desktop.css` |
| Trim desktop.css | `desktop/src/styles/desktop.css` | Remove ALL dashboard rules (lines ~1-356), keep ONLY companion styles (~363-510) |
| Copy icons | `desktop/public/logos/dashboard/` | Copy all 23 SVGs from `app/public/logos/dashboard/` |
| Copy logos | `desktop/src/assets/logos/` | Copy `stage-logo-light.png` from `app/src/assets/logos/` |
| Copy favicon | `desktop/public/` | Copy `apple-touch-icon.png` from `app/public/` |

**Verify:** `pnpm install && pnpm build` succeeds. Companion UI renders correctly. Dashboard may look broken — expected.

---

## Phase 1: Shared Utilities & Base Components

**Goal:** Create the utility layer and shared components that dashboard components depend on.

| Action | File | Details |
|--------|------|---------|
| Create utils | `desktop/src/lib/utils.ts` | Port `cn()` (clsx+twMerge), `getGreeting()`, `getInitials()` |
| Create Avatar | `desktop/src/components/ui/Avatar.tsx` | Port from `app/src/components/ui/Avatar.tsx` — image + initials fallback |
| Create DashboardCard | `desktop/src/dashboard/components/DashboardCard.tsx` | Port `DashboardCard` + `CardTab` from `app/src/components/dashboard/DashboardCard.tsx` |

**Verify:** `pnpm typecheck` passes.

---

## Phase 2: Data Model Updates

**Goal:** Evolve Zod schemas and mock data to support richer component props.

| Action | File | Details |
|--------|------|---------|
| Update models | `desktop/src/dashboard/models/dashboard.ts` | `DashboardMetric.icon` → SVG paths; `DashboardProject` add optional `projectImageUrl`; `DashboardTask` add `projectName`, `projectImageUrl`, `dueDate`, `updatedAt`, `isCompleted`; remove `meta`/`tone` |
| Update mock data | `desktop/src/dashboard/data/dashboardSnapshot.ts` | SVG icon paths, realistic timestamps, project images |

**Verify:** `pnpm typecheck` — cascading type errors in components are expected (fixed in Phase 3).

---

## Phase 3: Component Redesign (Core)

**Goal:** Rewrite all dashboard components to visually match the web app.

### StageSidebar.tsx — full rewrite
Reference: `app/src/components/shared/Sidebar.tsx`
- Add `collapsed` state toggle (240px / 60px)
- SVG icons via CSS mask technique (`backgroundColor: "currentColor"`, `WebkitMask: url(...)`)
- Search box, Projects section with avatars, Help & Feedback, user profile footer
- Replace dark gradient active state with light `bg-[#e5e5e5]`
- Stage logo PNG import for expanded state

### DashboardHeader.tsx — redesign
Reference: `app/src/components/dashboard/DashboardPage.tsx` (header section, lines 213-240)
- Left: greeting h1 (20px semibold) + subtitle (13px, #737373)
- Right: "This Month" selector + purple gradient "Create Project" button with plus icon SVG
- Gradient: `from-[#7b76df] to-[#463fba]`

### MetricGrid.tsx — redesign
Reference: `app/src/components/dashboard/DashboardStats.tsx`
- 4-col grid of individual StatCards
- Each: `rounded-[8px] bg-[#f5f5f5] p-[16px] shadow-[0px_0.45px_1px_0px_rgba(10,10,10,0.25)]`
- SVG icon (18x18) → value (20px bold) → label (12px, #737373)

### ActivityTimelineChart.tsx — full rewrite
Reference: `app/src/components/dashboard/Timeline.tsx`
- SVG-based stepped-area chart with gradient fill (purple, 0.45 → 0.12 opacity)
- Port `buildSteppedAreaPath()` function
- Date labels below chart
- Skip hover interaction and project markers for now (mock data doesn't support them)

### New: UpcomingTasksCard.tsx
Reference: `app/src/components/dashboard/UpcomingTasksCard.tsx`
- Uses `DashboardCard` wrapper with `CardTab`
- Project avatar + task title + project name + computed urgency (red/orange/green from `dueDate`)
- Separator lines between entries

### New: RecentActivityCard.tsx
Reference: `app/src/components/dashboard/RecentActivityCard.tsx`
- Uses `DashboardCard` wrapper with `CardTab`
- "Updated: ..." / "Completed: ..." prefix + project name + time-ago from `updatedAt`

### Delete: DashboardPanel.tsx — replaced by UpcomingTasksCard + RecentActivityCard
### Delete: DashboardStatus.tsx — not present in web app design

**Verify:** `pnpm dev` — visual comparison with web app screenshots. All components match.

---

## Phase 4: Layout Integration

**Goal:** Match the web app's `AppLayout` flex layout in the desktop shell.

### DashboardContextView.tsx — restructure
Reference: `app/src/components/shared/AppLayout.tsx`
- Replace CSS grid with flex layout: outer `flex h-screen bg-[#f5f5f5] p-[4px]`, inner `flex flex-1 overflow-hidden rounded-[8px] border border-[#f5f5f5] bg-white`
- Content area: `flex flex-1 flex-col overflow-y-auto` with padding `p-[44px]`
- Vertical gap structure: `gap-[44px]` between major sections, `gap-[18px]` header+stats, `gap-[8px]` card pairs
- Remove DashboardStatus import
- Wire new UpcomingTasksCard + RecentActivityCard

### DesktopShell.tsx — update outer wrapper
- Replace `.desktop-shell` class with Tailwind: `min-h-screen` (companion components are position:fixed, unaffected)

**Verify:** Sidebar + content scroll independently. Companion overlays still work.

---

## Phase 5: Polish & Cleanup

- Final `desktop.css` cleanup — only companion styles remain, add header comment
- Remove dead files (`DashboardPanel.tsx`, `DashboardStatus.tsx`)
- Final `pnpm typecheck && pnpm build`
- Update `desktop/03-05-desktop-build-tracker.md`
- Update this file (`desktop/05-04-redesign-plan.md`) with completion status

**Verify:** Full typecheck + build + dev smoke test. Visual match with web app.

---

## Files NOT Touched (safety boundary)

- `desktop/electron/` — main process, preload, IPC bridge
- `desktop/src/companion/` — CompanionOrb, VoiceControlBar, CritiquePanel, hooks, models, data
- `desktop/src/hooks/` — useCompanionState, useDesktopBridge
- `desktop/shared/` — desktop Zod models (DesktopSession, ActiveAppInfo, etc.), IPC channels

## New npm Dependencies

| Package | Type | Purpose |
|---------|------|---------|
| `@tailwindcss/vite` | dev | Tailwind v4 Vite plugin |
| `tailwindcss` | dev | Tailwind v4 core |
| `clsx` | prod | Class name helper for `cn()` |
| `tailwind-merge` | prod | Tailwind class deduplication for `cn()` |
| `motion` | prod | Animations (Framer Motion successor) |

## Future Work (NOT in this redesign)

- Project detail pages (`app/src/components/project/`) → desktop with mock data first
- Settings pages (`app/src/components/settings/`) → desktop with mock data first
- Integrations page (`app/src/components/settings/IntegrationsTab.tsx`) → desktop with mock data first
- Real Convex data integration (replacing mock `dashboardSnapshot`)
- Interactive timeline with hover/project markers
- PipelineCard + PaymentsCard (bottom row dashboard cards)
- DashboardTimelineSelector dropdown (full implementation)

## Current Mock UI Migration Notes

This is separate from the completed dashboard redesign.

Started:

- `desktop/src/app/WorkspaceFrame.tsx`
- `desktop/src/settings/models/settings.ts`
- `desktop/src/settings/data/settingsSnapshot.ts`
- `desktop/src/settings/components/SettingsIcons.tsx`
- `desktop/src/settings/components/SettingsPrimitives.tsx`
- `desktop/src/settings/components/SettingsPageView.tsx`
- `desktop/src/project/models/project.ts` converted to Zod-backed models
- `desktop/src/project/data/projectSnapshot.ts` expanded with mock research, moodboard, flows, and assets

Next:

- Add desktop routes.
- Wire sidebar navigation.
- Finish project tab mock screens.
- Verify with `pnpm run typecheck` and `pnpm run build`.
