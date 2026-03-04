# Prototype Audit Plan

## Doel

Deze audit is bedoeld om de React-app weer strak gelijk te trekken met de goedgekeurde HTML prototypes, zonder opnieuw brede refactors of scope creep te introduceren.

Belangrijk:

- alleen verschillen met de prototypes fixen
- geen nieuwe features toevoegen
- geen auth-scope uitbreiden
- visuele regressies eerst, structurele cleanup pas daarna

## Scope

Prototype bronbestanden:

- [auth.html](/Users/wernerjohannesdieben/stage_mvp/prototypes/auth.html)
- [dashboard.html](/Users/wernerjohannesdieben/stage_mvp/prototypes/dashboard.html)
- [landing.html](/Users/wernerjohannesdieben/stage_mvp/prototypes/landing.html)
- [project-creation.html](/Users/wernerjohannesdieben/stage_mvp/prototypes/project-creation.html)
- [project-detail.html](/Users/wernerjohannesdieben/stage_mvp/prototypes/project-detail.html)
- [settings.html](/Users/wernerjohannesdieben/stage_mvp/prototypes/settings.html)
- [task-detail.html](/Users/wernerjohannesdieben/stage_mvp/prototypes/task-detail.html)

React doelbestanden:

- `app/src/components/auth/*`
- `app/src/components/dashboard/*`
- `app/src/components/landing/*`
- `app/src/components/creation/*`
- `app/src/components/project/*`
- `app/src/components/task/*`
- `app/src/components/shared/*`
- `app/src/styles/*`

## Al gedaan

Deze punten zijn al aangepast en hoeven alleen nog gevalideerd te worden tijdens de audit:

| Area | Fix | Status |
|------|-----|--------|
| Settings | CSS herschreven naar prototype markup | Done |
| Project Creation | Dubbele nav weg, card wrapper weg, vertical centering, max width gecorrigeerd | Done |
| Navbar | Logo + back-link naast elkaar, sizes gefixt | Done |
| Auth bypass | Env-based via `VITE_AUTH_DEV_BYPASS` in plaats van hardcoded true | Done |
| Project Detail Header | Titel, progress bar, menu icon, share button styling aangepast | Done |
| Task Detail | Titel en checkbox sizing aangepast | Done |
| Phase Navigation | Dot sizing, padding, `X / Y` format, active weight, pulse animatie | Done |
| Task Rows | Hover background en padding aangepast | Done |
| Project Detail | Extra bottom padding toegevoegd | Done |

## Niet in scope

Deze audit doet expliciet **niet**:

- password auth toevoegen
- forgot/reset password toevoegen
- product copy of flows inhoudelijk wijzigen tenzij het prototype dat vereist
- backend-auth of Convex-datamodel opnieuw ontwerpen
- nieuwe billing-integraties toevoegen

Auth-scope blijft:

- email OTP
- Google login

## Werkvolgorde

Werk altijd in deze volgorde, zodat de grootste visuele regressies eerst worden opgelost:

1. Dashboard
2. Landing Page
3. Auth Page
4. Hercontrole van eerder gefixte pages

Waarom deze volgorde:

- Dashboard is het hoofdscherm en valt direct op
- Landing bepaalt de eerste indruk
- Auth moet strak zijn, maar is functioneel al grotendeels goed
- Re-check voorkomt dat eerdere fixes later weer stiekem afwijken

## Auditmethode

Per pagina:

1. Prototype openen
2. React implementatie openen
3. Alleen afwijkingen noteren in:
   - layout
   - spacing
   - typography
   - colors
   - border radius
   - shadows
   - hover / active states
   - empty states
4. Eerst CSS/layout fixes doen
5. Pas daarna kleine component-structuurcorrecties doen als dat nodig is om de styling goed te krijgen
6. `pnpm typecheck`
7. visuele browsercheck

## Batch 1 — Dashboard

Prototype:

- [dashboard.html](/Users/wernerjohannesdieben/stage_mvp/prototypes/dashboard.html)

React files:

- [DashboardPage.tsx](/Users/wernerjohannesdieben/stage_mvp/app/src/components/dashboard/DashboardPage.tsx)
- [DashboardCard.tsx](/Users/wernerjohannesdieben/stage_mvp/app/src/components/dashboard/DashboardCard.tsx)
- [DashboardEmptyState.tsx](/Users/wernerjohannesdieben/stage_mvp/app/src/components/dashboard/DashboardEmptyState.tsx)
- [DashboardStats.tsx](/Users/wernerjohannesdieben/stage_mvp/app/src/components/dashboard/DashboardStats.tsx)
- [DashboardTimelineSelector.tsx](/Users/wernerjohannesdieben/stage_mvp/app/src/components/dashboard/DashboardTimelineSelector.tsx)
- [PaymentsCard.tsx](/Users/wernerjohannesdieben/stage_mvp/app/src/components/dashboard/PaymentsCard.tsx)
- [RecentActivityCard.tsx](/Users/wernerjohannesdieben/stage_mvp/app/src/components/dashboard/RecentActivityCard.tsx)
- [UpcomingTasksCard.tsx](/Users/wernerjohannesdieben/stage_mvp/app/src/components/dashboard/UpcomingTasksCard.tsx)
- [ProjectDock.tsx](/Users/wernerjohannesdieben/stage_mvp/app/src/components/dashboard/ProjectDock.tsx)
- [Timeline.tsx](/Users/wernerjohannesdieben/stage_mvp/app/src/components/dashboard/Timeline.tsx)

Checklist:

- greeting size, weight, spacing
- stat cards height, padding, label/value sizes
- timeline selector spacing, active state, border radius
- empty state width, vertical rhythm, CTA alignment
- cards: border color, shadow, radius, internal spacing
- payments module copy hierarchy
- recent activity and upcoming tasks row density
- dock alignment, hover state, spacing from viewport bottom
- timeline tick marks, today marker, project block spacing

Exit criteria:

- dashboard visually matches prototype in both empty and populated state
- no second-order regressions in nav or page padding

## Batch 2 — Landing Page

Prototype:

- [landing.html](/Users/wernerjohannesdieben/stage_mvp/prototypes/landing.html)

React files:

- [LandingPage.tsx](/Users/wernerjohannesdieben/stage_mvp/app/src/components/landing/LandingPage.tsx)
- relevant landing styles in [landing.css](/Users/wernerjohannesdieben/stage_mvp/app/src/styles/landing.css)
- landing-specific shared UI used by the page

Checklist:

- hero spacing and text sizes
- top nav styling on landing variant
- primary CTA size, radius, shadow, hover state
- feature grid spacing and card styling
- device/mock sections against prototype proportions
- footer alignment, spacing, and links

Exit criteria:

- hero and CTA match prototype hierarchy
- feature cards and footer do not drift from prototype

## Batch 3 — Auth Page

Prototype:

- [auth.html](/Users/wernerjohannesdieben/stage_mvp/prototypes/auth.html)

React files:

- [AuthPage.tsx](/Users/wernerjohannesdieben/stage_mvp/app/src/components/auth/AuthPage.tsx)
- related shared UI inputs/buttons if styling divergence comes from primitives

Checklist:

- logo position and size
- email form spacing
- input height, radius, background, focus state
- primary button styling
- Google button styling and spacing
- OTP box size, spacing, font size, focus border
- error message spacing and alignment

Important product note:

- prototype includes Google button
- auth remains passwordless
- no forgot password UI should be introduced

Exit criteria:

- auth screen matches prototype in both email and OTP steps
- Google button visually fits without changing the passwordless flow

## Batch 4 — Re-check Earlier Fixes

Already changed pages that need a final sanity pass:

- [project-creation.html](/Users/wernerjohannesdieben/stage_mvp/prototypes/project-creation.html)
- [project-detail.html](/Users/wernerjohannesdieben/stage_mvp/prototypes/project-detail.html)
- [task-detail.html](/Users/wernerjohannesdieben/stage_mvp/prototypes/task-detail.html)
- [settings.html](/Users/wernerjohannesdieben/stage_mvp/prototypes/settings.html)

React files:

- [ProjectCreationPage.tsx](/Users/wernerjohannesdieben/stage_mvp/app/src/components/creation/ProjectCreationPage.tsx)
- [ProjectDetailPage.tsx](/Users/wernerjohannesdieben/stage_mvp/app/src/components/project/ProjectDetailPage.tsx)
- [TaskDetailPage.tsx](/Users/wernerjohannesdieben/stage_mvp/app/src/components/task/TaskDetailPage.tsx)
- [SettingsPage.tsx](/Users/wernerjohannesdieben/stage_mvp/app/src/components/settings/SettingsPage.tsx)
- [settings.css](/Users/wernerjohannesdieben/stage_mvp/app/src/styles/settings.css)

Checklist:

- no duplicate nav remains
- layout width and vertical centering still match prototype
- no placeholder CSS files remain
- component splits did not change visible hierarchy
- spacing around content areas matches prototype

Exit criteria:

- these pages still match the prototype after the new audit batches land

## Verification per batch

After every batch:

1. `pnpm typecheck`
2. `pnpm build`
3. browser compare against prototype
4. screenshot before/after if the delta is visual only

## Risk controls

To keep this safe:

- do not refactor component architecture unless styling cannot be fixed otherwise
- keep changes page-local where possible
- avoid touching Convex auth/backend while doing prototype work
- do not mix prototype audit work with billing/auth/provider setup work

## Success definition

This plan is complete when:

- Dashboard matches prototype
- Landing matches prototype
- Auth matches prototype
- earlier fixed pages still match prototype
- app still passes `pnpm typecheck` and `pnpm build`
