# 2026-03-03 Implementation Roadmap

## Stack Decision

We keep the current stack:

- `Vite + React`
- `TanStack Router`
- `TanStack Query`
- `Convex`

Primary data strategy:

- `Convex` stays the main data layer
- page/components use `convex/react` hooks for live queries and mutations
- `TanStack Router` is used for route structure, protected layouts, navigation, and selective preloading
- route loaders are optional and only used when they add real value

This matches Convex's React quickstart direction well for a client app with realtime data.

## Current State

Already done:

- Convex backend is wired into the app
- Convex Auth foundation is added
- protected route group renamed to `_authed`
- backend auth checks were added to projects, tasks, portal, settings, dashboard
- shared `lib/constants.ts`, `lib/format.ts`, `hooks/useFeedback.ts`, `hooks/useActionError.ts` were added
- `pnpm typecheck` is green

Still open:

- live auth smoke test was not done yet
- route protection can be made cleaner later with a more explicit router-level auth model
- large pages are still too heavy
- one build issue remains around missing `settings.css`

## Main Goal

Get the app to a clean, maintainable, release-ready state without changing product behavior unnecessarily.

## Work Order

### Phase 1: Stabilize Auth and Routing

Goal:

- one clear protected route area
- one clear auth abstraction
- no scattered auth logic in random components

Tasks:

- keep all protected routes under `app/src/routes/_authed/*`
- keep auth UI logic behind `app/src/lib/auth.ts`
- validate real login flow with:
  - email OTP
  - Google auth
  - sign out
- verify Convex env config and callback behavior
- decide whether `_authed.tsx` stays hook-driven or later moves to stricter route-context auth orchestration

Notes:

- backend auth must remain enforced in Convex even if route protection exists
- frontend route protection is convenience
- backend checks are security

### Phase 2: Fix Remaining Runtime / Build Issues

Goal:

- app should typecheck and build cleanly

Tasks:

- fix missing stylesheet import used by `SettingsPage`
- run full local build again
- run `npx convex dev` and confirm schema/auth setup is valid
- check generated route tree after `_authed` move

### Phase 3: Route Layer Cleanup

Goal:

- route files become thin and predictable

Rules:

- route file handles:
  - layout
  - protection
  - optional loader/prefetch
  - page mounting
- page file handles:
  - view composition
  - local UI state
  - calling Convex hooks

Tasks:

- keep `_authed.tsx` as the protected layout shell
- keep child route files very small
- avoid UI logic inside route files
- only add route loaders if they improve UX in a measurable way

### Phase 4: Refactor Heavy Pages

Goal:

- page files become containers instead of giant mixed files

Priority order:

1. `DashboardPage`
2. `SettingsPage`
3. `ProjectDetailPage`
4. `ProjectCreationPage`
5. `LandingPage`

Target pattern for each page:

- container page
- feature subcomponents
- feature hooks for local state
- shared formatting/constants in `lib`
- no large inline helper blocks at bottom of page files

### Phase 5: Dashboard Refactor

Target split:

- `DashboardPage.tsx` = container only
- extract:
  - stats section
  - payments card
  - recent activity card
  - upcoming tasks card
  - dock component
  - timeline selector

Extra cleanup:

- dock logic should move to a hook
- selector options/constants should live outside the page
- formatting should use shared helpers only

### Phase 6: Settings Refactor

Target split:

- `SettingsPage.tsx` = container only
- extract:
  - `GeneralTab`
  - `BillingTab`
  - `PortalTab`
  - settings icons
  - reusable feedback text component

Extra cleanup:

- file upload handling should stay in shared util/hook layer
- save feedback must stay state-driven
- no placeholder browser UX

### Phase 7: Project Detail Cleanup

Goal:

- remove browser-style temporary UX

Tasks:

- replace prompt/confirm style interactions with proper dialogs
- extract:
  - header
  - phase navigation
  - task list
  - modal components
- keep error handling in shared hook(s)

### Phase 8: Project Creation Refactor

Goal:

- isolate the complex multi-step logic cleanly

Tasks:

- move flow state into a dedicated hook
- extract per-step components
- keep constants and roadmap templates out of the page file
- keep page as orchestration only

## Loader Strategy

Default rule for this app:

- do not force route loaders for Convex-backed pages just because TanStack Router supports them

Use Convex hooks directly when:

- data is realtime
- page should stay reactive
- no server-style preload benefit is needed

Use route loaders only when:

- route-level redirect/protection is needed
- prefetch meaningfully improves first render
- data is not naturally handled by Convex reactivity

## Clean Code Rules

Rules for the remaining refactor:

- no `any`
- no giant inline constants in page files
- no helper graveyards at the bottom of page files
- no route-level business logic in UI components
- no auth duplication across protected pages
- no browser `prompt`, `confirm`, or `alert`
- page files should stay focused on composition

## Immediate Next Steps

1. Fix the remaining `SettingsPage` build issue
2. Run `npx convex dev` and validate auth flow end-to-end
3. Refactor `DashboardPage`
4. Refactor `SettingsPage`
5. Continue with `ProjectDetailPage`
