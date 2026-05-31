# Frontend layout architecture plan

**Date:** 30 May 2026  
**App:** `apps/user-application`  
**Status:** Migration plan — audit tracking  
**Scope:** `apps/user-application/src`  
**Last audit:** 31 May 2026

---

## CAPTION: Why this exists

The current frontend folder structure does not feel clear enough.

The current app has a mixed structure:

```txt
src/app
src/auth
src/client-portal
src/companion
src/components
src/dashboard
src/features
src/project
src/project-context
src/routes
src/settings
src/subscriptions
src/tasks
```

The concern is that this becomes hard to scan:

```txt
Some components live in src/components.
Some components live in src/project/components.
Some components live in src/dashboard/components.
Some feature logic lives in src/features.
Some domain logic lives at root feature folders.
```

This is not necessarily broken, but it is not as easy to understand as the
structure used in the other application.

## CAPTION: Preferred direction

The preferred direction is closer to this:

```txt
src/
  components/
    api-docs/
    auth/
    blocks/
    carousel/
    common/
    dashboard/
    docs/
    editor/
    home-page/
    project/
    settings/
    tasks/
    ui/
  hooks/
  lib/
  routes/
  styles/
  types/
  utils/
```

This makes the UI layer easier to inspect because a developer can start in one
place:

```txt
src/components
```

Then feature/domain components are grouped underneath it.

## CAPTION: What feels wrong today

Current example:

```txt
src/project/components/tabs/research/ResearchTab.tsx
src/project/types/researchTab.ts
src/project/data/fixtures/researchTabFixtures.ts
src/project/helpers/...
```

This is clean from a feature-folder perspective, but less aligned with the other
app where components are centralized under `src/components`.

The concern:

```txt
When a new developer opens the repo, they must learn multiple layout patterns.
Some things are root-level domains.
Some things are centralized components.
Some things are features.
Some things are hooks.
```

## CAPTION: Important constraint

Do not do a blind folder move.

This app already has working routes, imports, Convex hooks, Electron bindings,
and project tab components. A large mechanical move can create unnecessary risk.

The first step is to agree on the target architecture.

## CAPTION: Proposed target structure

Recommended target:

```txt
src/
  components/
    app/
    auth/
    client-portal/
    companion/
    dashboard/
    integrations/
    project/
      detail/
      header/
      tabs/
        research/
        strategy/
        moodboard/
        flows/
        wireframes/
        generate/
        assets/
      create/
      kanban/
    settings/
    subscriptions/
    tasks/
    ui/

  hooks/
    convex-data/
    engine/
    project/
    settings/
    tasks/

  lib/
    auth/
    convex/
    desktop/
    errors/

  models/
    project/
    research/
    strategy/
    settings/

  types/
    project/
    research/
    strategy/
    integrations/

  data/
    fixtures/

  routes/
```

This gives a clearer split:

```txt
components = UI
hooks = React hooks and data access wrappers
lib = low-level app services/helpers
models = Zod/domain schemas
types = TypeScript view/domain types
data/fixtures = mock/demo data only
routes = TanStack Router files only
```

## CAPTION: Component ownership rule

Components should be centralized under:

```txt
src/components/<domain>
```

Examples:

```txt
src/components/project/tabs/research/ResearchTab.tsx
src/components/project/tabs/research/CompetitiveAnalysis.tsx
src/components/settings/IntegrationsPage.tsx
src/components/dashboard/StageSidebar.tsx
src/components/tasks/TasksPageView.tsx
```

Do not mix equivalent UI ownership between:

```txt
src/project/components
src/components/project
```

Pick one long-term pattern.

## CAPTION: Domain logic rule

Domain logic should not live inside UI components.

Use:

```txt
src/models/<domain>
src/types/<domain>
src/hooks/<domain>
src/lib/<domain>
src/data/fixtures
```

For Research:

```txt
src/components/project/tabs/research/
  UI components

src/models/research/
  Zod schemas and artifact models

src/types/research/
  view/domain types

src/hooks/project/
  useResearchArtifact
  useGenerateResearch

src/data/fixtures/
  researchTabFixtures.ts
```

## CAPTION: Routes stay thin

Routes should not become the place where feature logic lives.

Allowed:

```txt
createFileRoute
beforeLoad auth checks
layout selection
small loader/prefetch only when needed
render one page/view component
```

Not allowed:

```txt
large UI trees
feature state machines
AI workflow logic
Convex mutation logic
provider execution logic
```

## CAPTION: Migration strategy

Recommended migration strategy:

```txt
1. Do not move everything immediately.
2. Pick the target folder convention.
3. Move one domain at a time.
4. Start with Research because it is already split and central to the AI workflow.
5. Keep route behavior unchanged.
6. Run typecheck after each domain move.
```

Suggested first migration:

```txt
Move:
  src/project/components/tabs/research/*

To:
  src/components/project/tabs/research/*

Keep:
  src/project/data/fixtures/researchTabFixtures.ts
  until artifact contracts are ready

Then later move fixtures to:
  src/data/fixtures/researchTabFixtures.ts
```

## CAPTION: What not to do

Do not combine the architecture cleanup with AI workflow implementation.

Bad:

```txt
Move folders, create researchArtifact, connect Claude/Codex, connect Refero,
and redesign Research UI in one pass.
```

Good:

```txt
First decide layout architecture.
Then migrate one UI domain.
Then connect artifact contracts.
Then connect AI workflows.
```

## CAPTION: Decisions (agreed)

```txt
1. UI → src/components/<domain>          YES
2. Hooks → src/hooks/<domain>            YES
3. Helpers → src/lib/<domain>            YES
4. Models → src/models/<domain>          YES
5. Types → src/types/<domain>            YES
6. Fixtures → src/data/fixtures          YES
7. Routes stay thin in src/routes        YES
8. Root feature folders phased out       YES (after each domain move)
```

Final architecture:

```txt
src/components/<domain>   UI
src/hooks/<domain>        React hooks and data wrappers
src/lib/<domain>          helpers and low-level services
src/models/<domain>       Zod/domain schemas
src/types/<domain>        TypeScript view/domain types
src/data/fixtures         mock/demo data only
src/routes                TanStack Router files only
```

## CAPTION: Audit table

Use this table to track migration progress. Update **Status** and **Done** after
each domain slice is moved and typecheck passes.

**Status legend:** `pending` · `in progress` · `done` · `skip` (already correct)

### Summary

| Layer | Files to move | Already correct | Total |
|---|---:|---:|---:|
| components | 151 | 19 | 170 |
| hooks | 12 | 23 | 35 |
| lib (helpers) | 18 | 14 | 32 |
| models | 5 | 0 | 5 |
| types | 8 | 5 | 13 |
| data/fixtures | 6 | 0 | 6 |
| other (app, auth, features, …) | 26 | 0 | 26 |

### Phase 1 — Project domain (start here)

| # | Layer | Current path | Target path | Files | Priority | Status | Done |
|---|---|---|---|---:|---|---|---|
| 1.1 | components | `src/project/components/tabs/research` | `src/components/project/tabs/research` | 11 | 1 | pending | |
| 1.2 | components | `src/project/components/tabs/strategy` | `src/components/project/tabs/strategy` | 7 | 2 | pending | |
| 1.3 | components | `src/project/components/tabs/moodboard` | `src/components/project/tabs/moodboard` | 16 | 3 | pending | |
| 1.4 | components | `src/project/components/tabs/flows` | `src/components/project/tabs/flows` | 13 | 4 | pending | |
| 1.5 | components | `src/project/components/tabs/wireframes` | `src/components/project/tabs/wireframes` | 11 | 5 | pending | |
| 1.6 | components | `src/project/components/tabs/assets` | `src/components/project/tabs/assets` | 8 | 6 | pending | |
| 1.7 | components | `src/project/components/tabs/*.tsx` (root tab files) | `src/components/project/tabs/` | 7 | 7 | pending | |
| 1.8 | components | `src/project/components/create` | `src/components/project/create` | 7 | 8 | pending | |
| 1.9 | components | `src/project/components/kanban` | `src/components/project/kanban` | 4 | 9 | pending | |
| 1.10 | components | `src/project/components/header` | `src/components/project/header` | 2 | 10 | pending | |
| 1.11 | components | `src/project/components/details` | `src/components/project/details` | 1 | 11 | pending | |
| 1.12 | components | `src/project/components/*.tsx` (root views) | `src/components/project/` | 6 | 12 | pending | |
| 1.13 | hooks | `src/project/hooks` | `src/hooks/project` | 6 | 13 | pending | |
| 1.14 | lib | `src/project/helpers` | `src/lib/project` | 6 | 14 | pending | |
| 1.15 | models | `src/project/models` | `src/models/project` | 3 | 15 | pending | |
| 1.16 | types | `src/project/types` | `src/types/project` | 5 | 16 | pending | |
| 1.17 | data | `src/project/data/fixtures` | `src/data/fixtures/project` | 4 | 17 | pending | |
| 1.18 | data | `src/project/data/*.ts` (snapshots) | `src/data/project` | 2 | 18 | pending | |
| 1.19 | cleanup | `src/project/` (empty after move) | remove folder | — | 19 | pending | |

### Phase 2 — Dashboard

| # | Layer | Current path | Target path | Files | Priority | Status | Done |
|---|---|---|---|---:|---|---|---|
| 2.1 | components | `src/dashboard/components` | `src/components/dashboard` | 15 | 20 | pending | |
| 2.2 | hooks | `src/dashboard/hooks` | `src/hooks/dashboard` | 1 | 21 | pending | |
| 2.3 | lib | `src/dashboard/helpers` | `src/lib/dashboard` | 4 | 22 | pending | |
| 2.4 | models | `src/dashboard/models` | `src/models/dashboard` | 1 | 23 | pending | |
| 2.5 | cleanup | `src/dashboard/` | remove folder | — | 24 | pending | |

### Phase 3 — Settings

| # | Layer | Current path | Target path | Files | Priority | Status | Done |
|---|---|---|---|---:|---|---|---|
| 3.1 | components | `src/settings/components` | `src/components/settings` | 11 | 25 | pending | |
| 3.2 | lib | `src/settings/helpers` | `src/lib/settings` | 4 | 26 | pending | |
| 3.3 | models | `src/settings/models` | `src/models/settings` | 1 | 27 | pending | |
| 3.4 | types | `src/settings/types` | `src/types/settings` | 1 | 28 | pending | |
| 3.5 | data | `src/settings/data` | `src/data/settings` | 1 | 29 | pending | |
| 3.6 | cleanup | `src/settings/` | remove folder | — | 30 | pending | |

### Phase 4 — Tasks

| # | Layer | Current path | Target path | Files | Priority | Status | Done |
|---|---|---|---|---:|---|---|---|
| 4.1 | components | `src/tasks/components` | `src/components/tasks` | 7 | 31 | pending | |
| 4.2 | hooks | `src/tasks/hooks` | `src/hooks/tasks` | 1 | 32 | pending | |
| 4.3 | lib | `src/tasks/helpers` | `src/lib/tasks` | 2 | 33 | pending | |
| 4.4 | types | `src/tasks/types` | `src/types/tasks` | 1 | 34 | pending | |
| 4.5 | data | `src/tasks/data/fixtures` | `src/data/fixtures/tasks` | 1 | 35 | pending | |
| 4.6 | cleanup | `src/tasks/` | remove folder | — | 36 | pending | |

### Phase 5 — Smaller domains

| # | Layer | Current path | Target path | Files | Priority | Status | Done |
|---|---|---|---|---:|---|---|---|
| 5.1 | components | `src/client-portal/components` | `src/components/client-portal` | 4 | 37 | pending | |
| 5.2 | components | `src/subscriptions/components` | `src/components/subscriptions` | 1 | 38 | pending | |
| 5.3 | components | `src/companion/*.tsx` | `src/components/companion` | 3 | 39 | pending | |
| 5.4 | hooks | `src/companion/hooks` | `src/hooks/companion` | 1 | 40 | pending | |
| 5.5 | models | `src/companion/models` | `src/models/companion` | 1 | 41 | pending | |
| 5.6 | data | `src/companion/data` | `src/data/companion` | 1 | 42 | pending | |
| 5.7 | components | `src/auth/DesktopAuthView.tsx` | `src/components/auth` | 1 | 43 | pending | |
| 5.8 | components | `src/app/*.tsx` | `src/components/app` | 4 | 44 | pending | |
| 5.9 | hooks | `src/app/hooks` | `src/hooks/app` | 2 | 45 | pending | |
| 5.10 | lib | `src/app/layout/chromeRules.ts` | `src/lib/app` | 1 | 46 | pending | |
| 5.11 | cleanup | `src/client-portal/`, `src/subscriptions/`, `src/companion/`, `src/auth/`, `src/app/` | remove folders | — | 47 | pending | |

### Phase 6 — Features & context (discuss before move)

| # | Layer | Current path | Target path | Files | Priority | Status | Done |
|---|---|---|---|---:|---|---|---|
| 6.1 | hooks | `src/features/onboarding/*` | `src/hooks/onboarding` or keep as feature module | 4 | 48 | discuss | |
| 6.2 | lib | `src/features/project-creation/*` | `src/lib/project-creation` or `src/hooks/project` | 3 | 49 | discuss | |
| 6.3 | lib | `src/project-context/*` | `src/lib/project-context` | 3 | 50 | discuss | |
| 6.4 | lib | `src/data-ops/schema.ts` | `src/lib/data-ops` | 1 | 51 | discuss | |

### Already correct — no move needed

| Layer | Path | Files | Status |
|---|---|---:|---|
| components | `src/components/ui` | 6 | skip |
| components | `src/components/onboarding` | 13 | skip |
| hooks | `src/hooks/convex-data` | 12 | skip |
| hooks | `src/hooks/engine` | 5 | skip |
| hooks | `src/hooks/*.ts` (root shared) | 6 | skip |
| lib | `src/lib/*.ts` + `src/lib/auth` | 14 | skip |
| types | `src/types/*.d.ts`, `src/types/index.ts` | 5 | skip |

### Per-move checklist

```txt
[ ] Move files (git mv)
[ ] Update all @/ imports
[ ] Run typecheck
[ ] Update audit row → status: done, done: YYYY-MM-DD
[ ] If domain folder empty → cleanup row
```

### Changelog

| Date | Change |
|---|---|
| 30 May 2026 | Initial plan and partial audit table |
| 31 May 2026 | Full audit table, decisions locked, phase order defined |

