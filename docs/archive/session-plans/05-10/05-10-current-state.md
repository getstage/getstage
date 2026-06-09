# Stage Desktop - Where We Are Now

Last updated: 2026-05-28 (see also `05-28/05-28-stage-engine-rename-decision.md` for the sidecar rename).
Read this first if you want a 60-second snapshot of the project before
diving into any other doc. The detailed implementation logs live in
`05-09/` and `05-10/`. The full step list lives in
`05-09/05-09-monorepo-implementation-tracker.md` - this doc only summarises.

## Caption: Stage Engine naming decision

As of May 28, 2026, the Rust sidecar is named **Stage Engine** and lives at:

```txt
apps/stage-engine/
```

Do not use `data-service` for current architecture. That name made the Rust app
sound like a cloud data backend. Stage Engine is the local desktop execution
engine for agents, file search, jobs, streaming, cancellation, and future native
macOS work. See `05-28/05-28-stage-engine-rename-decision.md`.

## Status in one paragraph

Steps 1-23 of the monorepo tracker are done. Desktop product data now
uses direct Convex from the renderer for projects, project detail,
phases, tasks, create project, task mutations, delete account, settings
clients list, profile name/avatar (R2 + `settings.updateProfile`), client
portal branding visibility by plan (`settings.getOverview`), and project-detail
kanban task creation (same Convex path as the Tasks page).
Electron IPC remains for auth handoff/session storage, shell/native, and
Rust sidecar work. Logout works. If no valid desktop session exists, the
desktop shows a real sign-in screen that opens the web-owned auth/signup/
onboarding/billing flow and resumes automatically after the browser
returns. Direct Convex product queries are skipped while signed out, so the
desktop no longer calls authenticated Convex functions before the login
screen is shown. The Convex Auth JWT now lives 30 days instead of 1 hour; this is
the launch choice for now, with monthly re-login instead of true
refresh-token rotation. A strict-typing rule + skill is in place so
future agents do not add `any` or `as` casts at process boundaries. Next
big step is Step 24: fake provider runner, after manual testing.

## What is live (live = direct Convex in desktop renderer)

```txt
Sidebar projects list
Projects page table
Project detail page header + kanban (phases + tasks)
Dashboard "Active Projects" metric + subheading
Client Portal projects table
Client Portal brand settings (Pro unlock from live plan; accent save to Convex)
Settings -> Clients (live Convex, not snapshot dummy data)
Settings -> Profile (avatar upload + save to Convex)
Settings -> Account session display ("Refresh session" when already signed in)
Tasks kanban: list, create, delete, set-priority (drag persists)
Create project: direct Convex mutation, real created project id
Delete account: direct Convex action, then local desktop logout
Logout button in sidebar account menu
401 / 403 -> auto-clear session -> UI drops to "Sign in"
Desktop route guard -> no session shows desktop sign-in screen
Signed-out direct Convex query guard -> no customer-visible server error
```

## What is still mock (intentionally deferred)

```txt
Project detail tabs: Research / Strategy / Moodboard / Flows /
  Wireframes / Assets
  -> needs /api/v1/projects/:id/ai/* wiring (queued; lives at
     apps/web-application/convex/api/routes/projects.ts already)
Project detail "task details" subroute (/project/:id/details)
  -> still uses mockProjectDetails; replace with /api/v1/tasks/:id
Dashboard chart / pipeline / revenue cards
  -> derived from selectedProjectContext only; revenue is intentionally
     "Not synced" until billing data is wired
Mock files that nothing live imports any more
  -> apps/user-application/src/project/data/projectSnapshot.ts
  -> apps/user-application/src/project/data/projectOverviewSnapshot.ts
  -> safe to delete in a cleanup pass
```

## What is NOT in scope yet (Steps 24+)

```txt
Step 24  Fake provider runner that receives typed project context
Step 25  Codex/Claude provider detection
Step 26  Deep file scanner
Step 27  .codex / .claude / AGENTS.md / CLAUDE.md discovery
Step 28  Design critique job pipeline
Step 29  Cloud voice transcription flow
Step 30  Basic Figma integration
Step 31  Basic Notion integration
Step 32  Web lifecycle event tracking for Resend flows
```

The Rust sidecar already exists for Steps 1-19 (health / readiness /
WS / engine.ping). Step 24 is the first pass that puts real product
work into the sidecar.

## What you need to do BEFORE the next agent runs

1. Convex testing deploy.
   The direct desktop functions in `convex/desktop.ts`, the account
   deletion action path, task mutations, create-project mutation, and the
   JWT `durationMs: 30 days` change are not live on testing until you deploy:
   ```bash
   cd apps/web-application
   pnpm run testing:deploy
   # plus convex deploy for the testing deployment if your script
   # does not already include it
   ```
2. Restart the desktop dev server after the deploy. Electron main
   process changes (auth, IPC, fetchers) do not hot-reload.
3. Sign out + back in once. New tokens minted after the deploy will
   live 30 days instead of 1 hour.

## Open decisions for you (Werner)

```txt
1. data-ops build pattern.
   Resolved on 2026-05-10. data-ops now builds to ./dist, and
   apps/user-application builds it before dev/typecheck/build.
   See: 05-10/05-10-data-ops-build-pattern.md.

2. Refresh-token rotation.
   Resolved for launch on 2026-05-10: ship Option A.
   The 30-day JWT stopgap is the chosen launch path, and users manually
   re-log once a month. Full Layer-2 refresh-token rotation remains
   queued for a later hardening pass, not before this launch test cycle.
   See: 05-10/05-10-token-refresh-and-tasks-priority-plan.md, Part 1.

3. Direct Convex subscriptions on the desktop.
   Direction changed on 2026-05-10: Stage is desktop-first. The desktop
   should use direct Convex useQuery/useMutation for cloud data, while
   Electron/Rust stay responsible for local/native/agent work. Web remains
   auth/payment/download/return-to-desktop. See:
   05-10/05-10-desktop-first-convex-data-ops-plan.md.
```

## Where each topic lives in the docs

```txt
Architecture / why monorepo / Rust sidecar boundary
  apps/user-application/docs/05-05-stage-monorepo-architecture.md

Step list (1-32) and what is checked off
  apps/user-application/docs/05-09/05-09-monorepo-implementation-tracker.md

Auth flow + session handoff details
  apps/user-application/docs/05-09/05-09-desktop-auth-deep-link-plan.md

Dynamic pages migration log (sidebar, projects, project detail,
client portal, dashboard, tasks)
  apps/user-application/docs/05-09/05-09-dynamic-pages-plan.md

Token expiry + tasks priority + logout + types policy
  apps/user-application/docs/05-10/05-10-token-refresh-and-tasks-priority-plan.md

Strict typing rule (no any, no as casts on boundary data)
  apps/user-application/docs/05-10/05-10-strict-typing-rule.md
  .claude/skills/strict-typing/SKILL.md  (agent-facing version)

Build-to-dist migration plan for data-ops
  apps/user-application/docs/05-10/05-10-data-ops-build-pattern.md

2026-05-11 session delta (settings, portal, kanban create)
  apps/user-application/docs/05-11/05-11-session-summary.md

2026-05-28 Stage Engine rename decision
  apps/user-application/docs/05-28/05-28-stage-engine-rename-decision.md
```

## Verification (latest: 2026-05-11)

```txt
packages/data-ops          pnpm run build          PASS
apps/user-application      pnpm run typecheck      PASS
apps/user-application      pnpm run build          PASS  (renderer bundle ~5k modules; varies)
git diff --check                                    PASS
```

Prior full stack check on 2026-05-10 also included `apps/web-application`
typecheck and `build:testing` PASS.

## Next agent's job (in this exact order)

```txt
1. Read this file (current-state) first.
2. Read 05-09/05-09-monorepo-implementation-tracker.md to confirm
   step status.
3. Manual test the direct desktop Convex paths:
   projects list, project detail, tasks kanban, create project, delete
   account, logout, and login return.
4. Verify the desktop logged-out/login screen:
   no stored session -> sign-in screen -> browser auth -> automatic
   return to desktop after `auth:session-changed`.
5. Then begin Step 24 (fake provider runner). Use:
   - .agents/skills/rust-engineer
   - .agents/skills/rust-async-patterns
   - .agents/skills/rust-best-practices
   - .claude/skills/strict-typing  (mandatory at every boundary)
6. Never add `any`, `as Capital`, or `Record<string, unknown>` to
   files under apps/user-application/electron, packages/data-ops,
   or apps/web-application/convex. Use Zod and proper types only.
   See 05-10/05-10-strict-typing-rule.md.
```
