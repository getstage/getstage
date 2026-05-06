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
- [~] 4. Continue mock-only UI migration from `app/` to `desktop/`: project pages, settings pages, integrations, and desktop-only chat/companion polish.
- [ ] 5. Add native proof-of-concepts later: global shortcut, active app detection, screen capture, permission status.
- [ ] 6. Prepare website login + `stage://auth` deep-link handler placeholder later.
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

Current active scope:

- **Mock design migration only.**
- No Convex wiring.
- No backend work.
- No real auth.
- No DB choice yet.
- No Rust/Swift/native implementation yet.
- Onboarding is not being moved into desktop; onboarding remains a web flow for now.

Next step:

- Continue Step 4 as a UI migration pass: project pages, settings pages, integrations, and project tab mock screens.

---

## Mock UI Migration Pass (2026-05-04, in progress)

Decision from Wessel:

- The desktop app should first copy the existing web app designs as closely as possible.
- The desktop app should use mock data only during this phase.
- The partner can later polish/convert extra Figma-specific desktop screens.
- The current web dashboard design is already the target direction, so desktop should reuse that visual language.
- Architecture decisions around Convex/Postgres/SQLite/Rust/Swift stay out of this pass.

### Completed in this pass

- Added shared desktop workspace frame:
  - `desktop/src/app/WorkspaceFrame.tsx`
  - This keeps the sidebar/content shell reusable across dashboard, project, settings, and integrations screens.
- Updated dashboard to use `WorkspaceFrame` instead of duplicating shell markup:
  - `desktop/src/app/DashboardContextView.tsx`
- Started settings mock structure with Zod models:
  - `desktop/src/settings/models/settings.ts`
  - `desktop/src/settings/data/settingsSnapshot.ts`
- Started settings UI primitives:
  - `desktop/src/settings/components/SettingsIcons.tsx`
  - `desktop/src/settings/components/SettingsPrimitives.tsx`
  - `desktop/src/settings/components/SettingsPageView.tsx`
- Converted project mock models from plain TypeScript types to Zod-backed schemas:
  - `desktop/src/project/models/project.ts`
- Expanded the mock project snapshot for later project tabs:
  - `desktop/src/project/data/projectSnapshot.ts`

### Completed after this note

- Add TanStack routes for:
  - `/project/$projectId`
  - `/settings`
  - `/settings/billing`
  - `/settings/clients`
  - `/settings/developer`
  - `/settings/account`
  - `/integrations`
  - `/settings/portal`
- Wired `StageSidebar` navigation to the mock routes instead of local-only active state.
- Added project tab mock screens:
  - `desktop/src/project/components/tabs/ResearchTab.tsx`
  - `desktop/src/project/components/tabs/StrategyTab.tsx`
  - `desktop/src/project/components/tabs/MoodboardTab.tsx`
  - `desktop/src/project/components/tabs/FlowsTab.tsx`
  - `desktop/src/project/components/tabs/GenerateTab.tsx`
  - `desktop/src/project/components/tabs/AssetsTab.tsx`
- Updated `ProjectDetailView` to use the shared desktop frame and show tab-specific mock screens.
- Added the Assets tab to `ProjectHeader`.
- Added route-aware sidebar state using TanStack Router.
- Added a developer handoff/start guide:
  - `desktop/05-04-desktop-start-guide.md`

### Verification

- `pnpm run typecheck` passes.
- `pnpm run build` passes.

### Still to finish in this mock UI migration pass

- Visual review in the running Electron app.
- Optional: polish exact spacing of project/settings screens against Figma/web screenshots.
- Optional: add separate mock screen for any missing web-only pages the partner wants inside desktop.
- Native/Convex/backend work stays paused until architecture is decided.

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
