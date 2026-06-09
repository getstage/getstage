# Frontend layout architecture plan

**Date:** 30 May 2026  
**App:** `apps/user-application`  
**Status:** Complete (Phases 1–5 migrated; follow-ups documented)  
**Scope:** `apps/user-application/src`  
**Last updated:** 31 May 2026

---

## CAPTION: Summary

The frontend `src/` layout migration is **done** for all product domains (project,
dashboard, settings, tasks, client-portal, subscriptions, companion, auth, app).

One pattern now applies:

```txt
src/components/<domain>   UI
src/hooks/<domain>        React hooks and data wrappers
src/lib/<domain>          helpers and low-level services
src/models/<domain>       Zod/domain schemas (app-local)
src/types/<domain>        TypeScript view/domain types
src/data/                 fixtures and snapshots
src/routes/               TanStack Router files only (thin)
```

**Verification:** `npm run typecheck` in `apps/user-application` passes after
Phases 1–5 (31 May 2026).

**Intentionally unchanged** (separate follow-ups, not part of this migration):

```txt
src/features/             cross-cutting flows (onboarding, project-creation)
src/project-context/      Convex project context bridge
src/data-ops/schema.ts    legacy schemas → migrate to packages/data-ops later
packages/data-ops/        shared Convex + @stage/data-ops (monorepo package)
```

---

## CAPTION: Why this existed

Before migration, the app mixed root-level domain folders with partial
centralization:

```txt
src/project/components/...
src/dashboard/components/...
src/components/ui/...
src/hooks/convex-data/...
```

A new developer had to learn multiple layout patterns. The target was the same
layer-based structure used in the other Stage app (`STEPPSAI`): one place per
concern, grouped by domain underneath.

---

## CAPTION: Current structure (after migration)

```txt
src/
  components/
    app/              Workspace shell, dashboard home view
    auth/             Desktop auth view
    client-portal/
    companion/        Orb, critique panel, voice bar
    dashboard/        Sidebar, metric cards, charts
    onboarding/       Onboarding modal and steps
    project/          Project views, tabs, kanban, create flow UI
    settings/
    subscriptions/
    tasks/
    ui/               Shared primitives (Button, Badge, …)

  hooks/
    app/              Desktop session / provider invalidation
    companion/
    convex-data/      Convex query/mutation wrappers
    dashboard/
    engine/           Provider run, desktop session
    project/
    tasks/
    *.ts              Shared root hooks (sidebar, companion state, …)

  lib/
    app/              chromeRules
    auth/
    dashboard/
    project/
    settings/
    tasks/
    *.ts              Shared utilities (convex, errors, format, …)

  models/
    companion/
    dashboard/
    project/
    settings/

  types/
    project/
    settings/
    tasks/
    index.ts          Barrel (includes types inferred from legacy schema)
    *.d.ts

  data/
    companion/
    fixtures/project/
    fixtures/tasks/
    project/          Snapshots (mockProject, overview)
    settings/

  features/           See “Deferred follow-ups”
  project-context/    See “Deferred follow-ups”
  data-ops/           See “Deferred follow-ups”

  routes/             Thin route files only
  styles/
  assets/
```

---

## CAPTION: Rules (locked)

| Layer | Rule |
|---|---|
| UI | `src/components/<domain>/` — never `src/<domain>/components/` |
| Hooks | `src/hooks/<domain>/` |
| Helpers | `src/lib/<domain>/` |
| App-local Zod | `src/models/<domain>/` |
| View types | `src/types/<domain>/` |
| Fixtures / mock data | `src/data/fixtures/<domain>/` |
| Routes | `createFileRoute`, auth, layout, render one view — no feature logic |
| Shared backend contracts | `packages/data-ops` → import `@stage/data-ops` |

**Import examples (current):**

```txt
@/components/project/ProjectDetailView
@/hooks/project/useLiveProject
@/lib/project/kanbanColumns
@/models/project/project
@/types/project/researchTab
@/data/fixtures/project/researchTabFixtures
@stage/data-ops                          ← Convex/API shared contracts
```

**Do not re-introduce:**

```txt
src/project/
src/dashboard/
src/settings/
src/tasks/
… as root feature folders with components/hooks/helpers inside
```

---

## CAPTION: Routes stay thin

Allowed in `src/routes/`:

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

---

## CAPTION: What not to combine

Do not mix folder migration with AI workflow implementation in one pass.

```txt
Good order:
  1. Layout migration (done)
  2. Artifact contracts in packages/data-ops
  3. AI workflow wiring
```

---

## CAPTION: Audit table

**Status legend:** `done` · `skip` (already correct) · `deferred` (follow-up)

### Migration summary

| Layer | Migrated | Skipped (already correct) | Deferred |
|---|---:|---:|---:|
| components | 132 | 19 | 0 |
| hooks | 12 | 23 | 0 |
| lib (helpers) | 18 | 14 | 0 |
| models | 5 | 0 | 0 |
| types | 6 | 5 | 0 |
| data | 6 | 0 | 0 |
| features / context / schemas | 0 | 0 | 3 areas |

### Phase 1 — Project ✅

| # | From | To | Status | Done |
|---|---|---|---|---|
| 1.1–1.12 | `src/project/components/**` | `src/components/project/**` | done | 2026-05-31 |
| 1.13 | `src/project/hooks` | `src/hooks/project` | done | 2026-05-31 |
| 1.14 | `src/project/helpers` | `src/lib/project` | done | 2026-05-31 |
| 1.15 | `src/project/models` | `src/models/project` | done | 2026-05-31 |
| 1.16 | `src/project/types` | `src/types/project` | done | 2026-05-31 |
| 1.17 | `src/project/data/fixtures` | `src/data/fixtures/project` | done | 2026-05-31 |
| 1.18 | `src/project/data/*.ts` | `src/data/project` | done | 2026-05-31 |
| 1.19 | `src/project/` | removed | done | 2026-05-31 |

### Phase 2 — Dashboard ✅

| # | From | To | Status | Done |
|---|---|---|---|---|
| 2.1 | `src/dashboard/components` | `src/components/dashboard` | done | 2026-05-31 |
| 2.2 | `src/dashboard/hooks` | `src/hooks/dashboard` | done | 2026-05-31 |
| 2.3 | `src/dashboard/helpers` | `src/lib/dashboard` | done | 2026-05-31 |
| 2.4 | `src/dashboard/models` | `src/models/dashboard` | done | 2026-05-31 |
| 2.5 | `src/dashboard/` | removed | done | 2026-05-31 |

### Phase 3 — Settings ✅

| # | From | To | Status | Done |
|---|---|---|---|---|
| 3.1 | `src/settings/components` | `src/components/settings` | done | 2026-05-31 |
| 3.2 | `src/settings/helpers` | `src/lib/settings` | done | 2026-05-31 |
| 3.3 | `src/settings/models` | `src/models/settings` | done | 2026-05-31 |
| 3.4 | `src/settings/types` | `src/types/settings` | done | 2026-05-31 |
| 3.5 | `src/settings/data` | `src/data/settings` | done | 2026-05-31 |
| 3.6 | `src/settings/` | removed | done | 2026-05-31 |

### Phase 4 — Tasks ✅

| # | From | To | Status | Done |
|---|---|---|---|---|
| 4.1 | `src/tasks/components` | `src/components/tasks` | done | 2026-05-31 |
| 4.2 | `src/tasks/hooks` | `src/hooks/tasks` | done | 2026-05-31 |
| 4.3 | `src/tasks/helpers` | `src/lib/tasks` | done | 2026-05-31 |
| 4.4 | `src/tasks/types` | `src/types/tasks` | done | 2026-05-31 |
| 4.5 | `src/tasks/data/fixtures` | `src/data/fixtures/tasks` | done | 2026-05-31 |
| 4.6 | `src/tasks/` | removed | done | 2026-05-31 |

### Phase 5 — Smaller domains ✅

| # | From | To | Status | Done |
|---|---|---|---|---|
| 5.1 | `src/client-portal/components` | `src/components/client-portal` | done | 2026-05-31 |
| 5.2 | `src/subscriptions/components` | `src/components/subscriptions` | done | 2026-05-31 |
| 5.3–5.6 | `src/companion/**` | `components/`, `hooks/`, `models/`, `data/` | done | 2026-05-31 |
| 5.7 | `src/auth/DesktopAuthView.tsx` | `src/components/auth` | done | 2026-05-31 |
| 5.8–5.10 | `src/app/**` | `components/app`, `hooks/app`, `lib/app` | done | 2026-05-31 |
| 5.11 | root domain folders above | removed | done | 2026-05-31 |

### Phase 6 — Deferred follow-ups (out of scope for this plan)

| # | Path | Decision | Status |
|---|---|---|---|
| 6.1 | `src/features/onboarding/` | **Keep** as cross-cutting feature module for now. Not UI; orchestrates onboarding gate + Convex. Revisit only if it grows large. | deferred |
| 6.2 | `src/features/project-creation/` | **Keep** for now. Draft + create flow logic used by project hooks. Could merge into `hooks/project/` later. | deferred |
| 6.3 | `src/project-context/` | **Keep** for now. Target when touched: `src/lib/project-context/`. | deferred |
| 6.4 | `src/data-ops/schema.ts` | **Do not** move to `src/lib/`. Migrate schemas to `packages/data-ops/src/`, switch imports to `@stage/data-ops`, then delete `src/data-ops/`. Still **in use** (see below). | deferred |

#### data-ops note

```txt
packages/data-ops/                    ← source of truth (Convex, @stage/data-ops)
src/data-ops/schema.ts                ← legacy app-local schemas (still imported)
```

Active consumers of `@/data-ops/schema`:

```txt
src/types/index.ts
src/models/project/createProject.ts
src/features/project-creation/createProjectFromDraft.ts
src/hooks/project/useProjectHeaderActions.ts
```

Also mirrored in `apps/web-application/src/data-ops/` — migrate both apps together
when moving schemas into the package.

### Already correct — no move needed

| Path | Status |
|---|---|
| `src/components/ui` | skip |
| `src/components/onboarding` | skip |
| `src/hooks/convex-data` | skip |
| `src/hooks/engine` | skip |
| `src/hooks/*.ts` (root shared) | skip |
| `src/lib/*.ts` + `src/lib/auth` | skip |
| `src/types/index.ts`, `src/types/*.d.ts` | skip |

---

## CAPTION: New file checklist

When adding code to this app:

```txt
[ ] UI for a domain → src/components/<domain>/
[ ] Hook for a domain → src/hooks/<domain>/
[ ] Helper / pure logic → src/lib/<domain>/
[ ] Zod (app-local) → src/models/<domain>/
[ ] TS view type → src/types/<domain>/
[ ] Mock/fixture data → src/data/fixtures/<domain>/
[ ] Shared Convex/API contract → packages/data-ops (not src/)
[ ] Route file stays thin → one import + one view component
```

---

## CAPTION: Changelog

| Date | Change |
|---|---|
| 30 May 2026 | Initial plan and audit table |
| 31 May 2026 | Decisions locked; full audit table |
| 31 May 2026 | **Phases 1–5 complete** — typecheck passes |
| 31 May 2026 | **Plan finalized** — current structure documented; Phase 6 marked deferred |
