# Frontend layout architecture plan

**Date:** 30 May 2026  
**App:** `apps/user-application`  
**Status:** Discussion plan  
**Scope:** `apps/user-application/src`

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

## CAPTION: Open decisions

Decisions needed before moving files:

```txt
1. Do we fully commit to src/components/<domain>?
2. Do models/types move to root src/models and src/types?
3. Do fixtures move to root src/data/fixtures?
4. Do hooks stay root-level grouped by domain?
5. Do we keep any root feature folders like src/project, or phase them out?
```

## CAPTION: Recommended answer

Recommended final architecture:

```txt
Use src/components/<domain> for UI.
Use src/hooks/<domain> for hooks.
Use src/models/<domain> for Zod/domain models.
Use src/types/<domain> for TypeScript types.
Use src/data/fixtures for mock data.
Keep src/routes only for route definitions.
Phase out root feature folders that only contain components/types/helpers.
```

This matches the other application more closely and makes the repo easier for a
new developer to scan.

## CAPTION: Audit table

| Current area | Current path | Suggested target | Status |
|---|---|---|---|
| Project UI | `src/project/components` | `src/components/project` | discuss |
| Research UI | `src/project/components/tabs/research` | `src/components/project/tabs/research` | good first move |
| Strategy UI | `src/project/components/tabs/strategy` | `src/components/project/tabs/strategy` | later |
| Moodboard UI | `src/project/components/tabs/moodboard` | `src/components/project/tabs/moodboard` | later |
| Flows UI | `src/project/components/tabs/flows` | `src/components/project/tabs/flows` | later |
| Wireframes UI | `src/project/components/tabs/wireframes` | `src/components/project/tabs/wireframes` | later |
| Assets UI | `src/project/components/tabs/assets` | `src/components/project/tabs/assets` | later |
| Project types | `src/project/types` | `src/types/project` or `src/types/research` | discuss |
| Project models | `src/project/models` | `src/models/project` | discuss |
| Project fixtures | `src/project/data/fixtures` | `src/data/fixtures` | discuss |
| Settings UI | `src/settings/components` | `src/components/settings` | discuss |
| Dashboard UI | `src/dashboard/components` | `src/components/dashboard` | discuss |
| Tasks UI | `src/tasks/components` | `src/components/tasks` | discuss |

