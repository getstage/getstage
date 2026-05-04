# Stage Desktop Build Tracker

Date: 2026-05-04

Reference plan: `desktop/03-05-desktop-app-plan.md`

Electron skill installed:

- Source: `https://skills.sh/teachingai/full-stack-skills/electron`
- Install command: `npx skills add https://github.com/teachingai/full-stack-skills --skill electron --yes`
- Local path: `.agents/skills/electron`

## Steps

- [x] 1. Set up `desktop/` Electron + Vite + React + TypeScript + TanStack skeleton.
- [x] 2. Add secure Electron foundation: `main.ts`, `preload.ts`, typed IPC bridge, safe BrowserWindow defaults.
- [x] 3. Copy/adapt current dashboard UI baseline from existing `.tsx` app screens.
- [ ] 4. Add desktop companion UI: voice/audio bar, companion orb, draggable critique/chat panel, thinking/response states. First pass added.
- [ ] 5. Add native proof-of-concepts: global shortcut, active app detection, screen capture, permission status.
- [ ] 6. Prepare website login + `stage://auth` deep-link handler placeholder.
- [x] 7. Verify: typecheck/build and confirm Electron dev app starts.

## Current Status

Steps 1 and 2 are complete.

Completed:

- Created standalone `desktop/package.json`.
- Added Electron/Vite config.
- Added React renderer entry.
- Added TanStack Router.
- Added TanStack Query provider.
- Added secure preload bridge.
- Added typed IPC channel constants.
- Added Zod desktop models in `desktop/shared/models`.
- Added hooks in `desktop/src/hooks`.
- Added first dashboard baseline shell.
- Split dashboard baseline into `models`, `data`, and small `components` folders.
- Added Zod-validated dashboard snapshot data for the desktop renderer.
- Added modular dashboard sidebar, header, metrics, timeline chart, panels, and status components.
- Added first companion UI placeholders.
- Split companion critique data into `models` and `data`.
- Added Zod-validated companion thread data.
- Added draggable panel hook for the critique/chat window.
- Updated the voice bar toward the Figma listening control.
- Typecheck passes.
- Build passes.
- Electron dev smoke starts successfully. The smoke command exits with `143` only because the process is intentionally killed after startup.
- Desktop scripts explicitly unset `ELECTRON_RUN_AS_NODE` before launching Electron, because this shell can otherwise force Electron into Node mode.

Next step:

- Continue Step 4: polish the companion UI states against the Figma audio/chat/critique screens.

---

## Dashboard Redesign (2026-05-04)

Reference plan: `desktop/05-04-redesign-plan.md`

All 6 phases completed:

- [x] Phase 0: Tailwind CSS v4 infrastructure — installed `@tailwindcss/vite`, `tailwindcss`, `clsx`, `tailwind-merge`, `motion`. Created `globals.css` with design tokens. Copied 23 SVG icons + Stage logo. Trimmed `desktop.css` to companion-only.
- [x] Phase 1: Shared utilities — created `lib/utils.ts` (`cn`, `getGreeting`, `getInitials`, `formatRelativeTime`), `components/ui/Avatar.tsx`, `dashboard/components/DashboardCard.tsx` + `CardTab`.
- [x] Phase 2: Data models — updated Zod schemas (`DashboardTask` now has `projectName`, `dueDate`, `updatedAt`, `isCompleted`). Updated mock data with SVG icon paths and timestamps.
- [x] Phase 3: Core component redesign — rewrote `StageSidebar` (collapsible, CSS mask icons, project avatars), `DashboardHeader` (purple gradient button), `MetricGrid` (individual StatCards), `ActivityTimelineChart` (SVG stepped-area chart). Created `UpcomingTasksCard` and `RecentActivityCard`.
- [x] Phase 4: Layout integration — `DashboardContextView` uses flex layout matching web app's `AppLayout`. `DesktopShell` cleaned up.
- [x] Phase 5: Cleanup — deleted `DashboardPanel.tsx` and `DashboardStatus.tsx`. Added `assets.d.ts` for image type declarations. Typecheck + build pass.

### Files created
- `desktop/src/styles/globals.css`
- `desktop/src/lib/utils.ts`
- `desktop/src/components/ui/Avatar.tsx`
- `desktop/src/dashboard/components/DashboardCard.tsx`
- `desktop/src/dashboard/components/UpcomingTasksCard.tsx`
- `desktop/src/dashboard/components/RecentActivityCard.tsx`
- `desktop/src/types/assets.d.ts`
- `desktop/public/logos/dashboard/` (23 SVG icons)
- `desktop/public/apple-touch-icon.png`
- `desktop/src/assets/logos/stage-logo-light.png`

### Files modified
- `desktop/package.json` — added 5 new dependencies
- `desktop/electron.vite.config.ts` — added Tailwind plugin to renderer
- `desktop/index.html` — added DM Sans font
- `desktop/src/main.tsx` — imports globals.css before desktop.css
- `desktop/src/styles/desktop.css` — trimmed to companion-only
- `desktop/src/app/DesktopShell.tsx` — Tailwind layout
- `desktop/src/app/DashboardContextView.tsx` — flex layout, new components
- `desktop/src/dashboard/components/StageSidebar.tsx` — full rewrite
- `desktop/src/dashboard/components/DashboardHeader.tsx` — redesigned
- `desktop/src/dashboard/components/MetricGrid.tsx` — redesigned
- `desktop/src/dashboard/components/ActivityTimelineChart.tsx` — SVG rewrite
- `desktop/src/dashboard/models/dashboard.ts` — updated schemas
- `desktop/src/dashboard/data/dashboardSnapshot.ts` — updated mock data
- `desktop/src/types/stage-desktop.d.ts` — cleaned up

### Files deleted
- `desktop/src/dashboard/components/DashboardPanel.tsx`
- `desktop/src/dashboard/components/DashboardStatus.tsx`

### Remaining work (future sessions)
- Project detail pages (`app/src/components/project/`) → desktop
- Settings pages (`app/src/components/settings/`) → desktop
- Real Convex data integration (replacing mock dashboardSnapshot)
- Interactive timeline with hover/project markers
- PipelineCard + PaymentsCard (bottom row dashboard cards)
- DashboardTimelineSelector dropdown (full implementation)
- Companion UI polish (Step 4 from original plan)
