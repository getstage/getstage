# Desktop session summary — 2026-05-11

Handoff for continuing work on another machine (e.g. iMac). Read
`05-10/05-10-current-state.md` first for the full snapshot; this file is the
**delta** for 2026-05-11.

## What changed (desktop `apps/user-application`)

```txt
Settings -> Clients
  Live Convex `clients.listForCurrentUser` (Zod-parsed). Empty and loading states.
  No more hard-coded `settingsSnapshot.clients` dummy rows.

Settings -> Profile
  Avatar: file picker -> R2 upload (`api.r2.generateUploadUrl` + `syncMetadata`)
  -> `api.settings.updateProfile` with `avatarKey`. Remove uses `updateProfile`
  with empty avatar. `SaveButton` awaits async saves.

Client Portal -> Brand Settings
  Paywall visibility uses real plan from `api.settings.getOverview`
  (`profile.plan === "pro"` unlocks branding UI).
  Accent color save calls `api.settings.updatePortalBranding`. Trial CTA can
  navigate to billing settings.

Settings -> Account
  When session is connected, primary button label is "Refresh session"
  (still opens web login for re-auth / token refresh flow).

Project detail Kanban (`KanbanBoard.tsx`)
  "+" create task uses real `CreateTaskDialog` + Convex `desktop.createTask`
  (no more local-only `project-task-${Date.now()}` ids).

`useLiveProject`
  Auth-gated: no `getProjectData` query until desktop session exists.

New hooks (direct Convex, auth-gated, Zod at boundary)
  `hooks/desktop-api/useClientsQuery.ts`
  `hooks/desktop-api/useSettingsOverviewQuery.ts`
  Exported from `hooks/desktop-api/index.ts`.
```

## Convex / web app deploy

This batch touched **only** `apps/user-application/`. No `apps/web-application/convex`
changes were required for these fixes.

If you later change Convex in `apps/web-application`, from that directory run:

```bash
pnpm run testing:deploy
```

Use `npx convex dev` in `apps/web-application` when you need a local Convex dev
loop or codegen against a dev deployment (long-running process).

## Verification run (2026-05-11)

```txt
pnpm --dir apps/user-application run typecheck   PASS
pnpm --dir apps/user-application run build        PASS
git diff --check                                  PASS
```

## Doc index (read order)

1. `docs/05-10/05-10-current-state.md` — primary "where we are" snapshot (updated 2026-05-11).
2. `docs/05-09/05-09-monorepo-implementation-tracker.md` — step checklist.
3. `docs/05-11/05-11-session-summary.md` — this file (today’s delta).
