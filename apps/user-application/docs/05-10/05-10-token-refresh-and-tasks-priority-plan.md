# Stage Desktop - Token Refresh, Tasks Priority, Types Policy

Date: May 10, 2026
Branch: `monorepo`
Scope: Three changes that came out of the 05-09 dynamic-pages pass.
Status: Planning document. Nothing implemented yet. Waiting for user "go".

## Context

After 05-09 pass 3 (memo fix + DevTools forwarding), the desktop app loads
live data correctly. Two real problems surfaced during testing:

```txt
1. Convex Auth JWT expires after 1 hour (default). Desktop has no refresh.
   The user must clear safeStorage and log in again every hour.
   Currently every /api/v1/* call returns 400 once the token expires
   and the UI silently spams retries.

2. The Tasks kanban screenshot shows High/Medium/Low/Backlog columns.
   Tasks have no `priority` field in convex/schema.ts.
   The 05-09 pass left this page mocked, blocked on a grouping decision.
   The user has chosen: ADD a priority enum field. Schema change is approved.
```

Plus one organizational question raised:

```txt
3. Where do TypeScript types and Zod schemas live? The user wants a clean
   /types folder convention so the partner can find files without grepping.
```

This doc proposes a single coherent plan for all three. Implementation
will be done in a separate pass after sign-off.

## Hard rules carried from 05-09 (do not violate)

```txt
1. No direct Convex client in the desktop renderer.
2. No tokens in renderer storage (only Electron main + safeStorage).
3. No new Convex tables (adding a field to an existing table IS allowed
   when explicitly approved - this is the case for tasks.priority).
4. No silent fallback to mock data when live data is expected.
5. Always Zod-validate at the IPC boundary AND the renderer query boundary.
6. After editing packages/data-ops, run `pnpm install` in apps/user-application.
```

---

## Part 1 - Token expiry: stopgap + refresh tokens

### Why both, not just refresh tokens

```txt
The real fix is refresh-token handoff (Layer 2). It is the right answer
long-term and is what the docs flagged as Step 23 stabilization.

But shipping only Layer 2 means the user keeps re-logging in every hour
during the multi-hour build window. Layer 1 is a one-line config change
on the testing Convex deployment that buys us breathing room without
changing any contract or shape.

We do BOTH in this plan; Layer 1 ships in 5 minutes, Layer 2 takes longer
and is reviewable on its own.
```

### Layer 1 - Stopgap (extend JWT lifetime)

Convex Auth lets you override the JWT lifetime in the auth config.
Current `apps/web-application/convex/auth.ts` does not set it, so the
default (1 hour) is used.

Change:

```ts
// apps/web-application/convex/auth.ts
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [...],
  jwt: {
    durationMs: 30 * 24 * 60 * 60 * 1000, // 30 days
  },
});
```

Deploy steps:

```bash
cd apps/web-application
pnpm exec convex deploy --prod=false   # or whatever the testing deploy script is
```

Important caveats:

```txt
- Existing 1-hour JWTs already minted DO NOT extend retroactively.
  They still expire at their original time. Users hit one more
  re-login, and after that future tokens last 30 days.
- 30-day JWTs that leak are a wider risk window. Acceptable while
  we test; revisit before production by replacing this stopgap with
  Layer 2 + a shorter access-token lifetime (e.g. 1 day).
```

### Layer 2 - Refresh-token handoff and silent retry

This is the production pattern. The web's Convex Auth client already
maintains both an access token (short-lived) and a refresh token
(long-lived, 30 days default). Today the desktop only receives the
access token during handoff.

Five changes:

#### 1. Web hands off the refresh token too

`apps/web-application/src/routes/auth.desktop.tsx`:

```txt
- Today: reads access JWT via useAuthToken(), submits as `code` field.
- After: also read the Convex refresh token and submit it as
  `refresh_token` field in the same form POST / stage:// callback.

The refresh token is stored by Convex Auth's React client in a place
that depends on the storage adapter (localStorage by default under a
key like `__convexAuthRefreshToken`). We need to use the official
hook/API rather than reading localStorage directly so we don't couple
to internals.
```

Open question to verify before implementation:

```txt
Does Convex Auth's React client expose a public hook to read the
current refresh token? If not, we may need:
  a) a small helper in apps/web-application/convex/auth.ts that
     returns the current session's refresh token via an authed query
  b) or wait on a Convex Auth API addition

Action: read Convex Auth source / docs in @convex-dev/auth/react
before writing code. If no public surface exists, fall back to the
helper-query approach.
```

#### 2. Electron stores both tokens

`apps/user-application/shared/models/desktop.ts`:

```ts
export const desktopStoredSessionSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1).optional(), // NEW - optional during migration
  refreshTokenExpiresAt: z.number().int().optional(), // NEW
  // ... existing fields
});
```

`apps/user-application/shared/models/desktop.ts` also adds:

```ts
export const desktopAuthHandoffSchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
  refresh_token: z.string().min(1).optional(), // NEW
});
```

Optional during migration so old stored sessions do not fail Zod parse;
we just treat them as "no refresh available".

#### 3. New `tokenRefresh.ts` module in electron/desktop-api

Path:

```txt
apps/user-application/electron/desktop-api/tokenRefresh.ts
```

Responsibility:

```ts
export async function refreshAccessToken(
  storedSession: DesktopStoredSession,
): Promise<DesktopStoredSession | null>
```

Calls Convex's HTTP refresh endpoint with the refresh token, parses
the response with Zod, and returns a new stored session with the
new access (and possibly new refresh) token. Returns `null` if the
refresh itself failed (refresh token expired or revoked).

Concurrency rule:

```txt
A single in-flight refresh promise is shared across concurrent callers.
If five list-projects calls all hit 401 at once, only ONE refresh fires
and all five await the same promise. Otherwise we burn refresh-token
rotations and may race-clobber the stored session.
```

#### 4. `fetchDesktopApiJson` retries once on 401

`apps/user-application/electron/helpers/desktop-api.ts`:

```ts
// Pseudocode shape, not final code:
async function fetchDesktopApiJson<T>(args: { accessToken, path }) {
  const response = await fetch(...);
  if (response.status === 401 || response.status === 403) {
    const stored = await authController.getStoredSession();
    if (stored?.refreshToken) {
      const refreshed = await refreshAccessToken(stored);
      if (refreshed) {
        await authController.replaceStoredSession(refreshed);
        // retry exactly once with the new token
        return fetchDesktopApiJson({ accessToken: refreshed.accessToken, path });
      }
    }
    // refresh failed or no refresh token
    await authController.clearSession();
    emitSessionChanged(null);
    throw new Error("Stage desktop session expired. Please sign in again.");
  }
  if (!response.ok) {
    throw new Error(`Stage API request failed with ${response.status}.`);
  }
  return response.json();
}
```

Retry rules:

```txt
- Retry only on 401 or 403, never on 4xx other than that, never on 5xx.
- Retry only ONCE. If the retry also fails, clear session and surface error.
- Do not retry on the /me verification call during initial login.
- Do not retry on the refresh call itself.
```

Why we retry on 401 only (not 400):

```txt
Convex Auth's correct response for an expired token is 401 Unauthorized.
The 400's seen in 05-09 logs were a quirk of the current auth.ts handler
returning 400 for any auth failure. We will fix the server response to
return 401 in the same pass; treating 400 as "maybe expired" is fragile
because 400 is also "bad request body".

If we cannot fix the server response in this pass, we explicitly include
400 in the retry condition, with a comment, and remove it once the
server is fixed.
```

#### 5. Renderer behaviour

```txt
On expired session (refresh failed):
  - Electron emits auth:session-changed with null session.
  - useDesktopApiInvalidation invalidates ["desktop","api"].
  - WorkspaceFrame's session query refetches, gets null.
  - Pages already render the "Sign in to Stage" empty state on error.
  - No code change needed in the renderer.
```

### Trigger condition (per the user)

```txt
"Only do this when the current token doesn't work right? Then we do
refresh token."

Confirmed: refresh is a REACTIVE retry on 401, not a proactive timer.
We do NOT poll the JWT exp claim. We do NOT refresh on a schedule.
The only trigger is a 401 from a real /api/v1 call.
```

---

## Part 2 - Tasks priority field

### Schema change

`apps/web-application/convex/schema.ts`:

```ts
const taskPriority = v.union(
  v.literal("low"),
  v.literal("medium"),
  v.literal("high"),
);

tasks: defineTable({
  phaseId: v.id("phases"),
  title: v.string(),
  isCompleted: v.boolean(),
  content: v.optional(v.string()),
  dueDate: v.optional(v.number()),
  assigneeIds: v.optional(v.array(v.string())),
  priority: v.optional(taskPriority),  // NEW - optional so existing rows are valid
  order: v.number(),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_phase", ["phaseId"])
  .index("by_phase_order", ["phaseId", "order"]),
```

Why optional:

```txt
Existing tasks have no priority. Optional means:
  - they pass schema validation as-is
  - on the desktop, they render in the "Backlog" column
  - new tasks can be created with a priority, or left undefined -> Backlog
```

Why an enum (and not a number 1-3):

```txt
- Three concrete labels matches the UI exactly (High / Medium / Low).
- v.union of literals is the Convex idiom and gives autocomplete.
- A number opens the door to "what does 1.5 mean" arguments later.
- Backlog is encoded as `priority === undefined`, NOT as a fourth literal,
  because Backlog is "not yet triaged", not a real priority level.
```

### Read-model change

`apps/web-application/convex/domain/projects/apiReadModel.ts`:

```ts
export async function buildApiTaskSummary(ctx, task) {
  // ... existing fields
  return {
    // ... existing
    priority: task.priority ?? null, // NEW - null for backlog, never undefined
    // ...
  };
}
```

We surface `null` (not `undefined`) over the wire so JSON serialisation
is explicit and Zod can require the key to be present.

### Contract change in data-ops

`packages/data-ops/src/contracts/desktop-api/task.ts`:

```ts
export const taskPrioritySchema = z.enum(["low", "medium", "high"]);

export const taskSummarySchema = z.object({
  // ... existing fields
  priority: taskPrioritySchema.nullable(), // NEW
  // ...
});

export type TaskPriority = z.infer<typeof taskPrioritySchema>;
```

### New endpoint - cross-project tasks for the kanban

The Tasks page is a global kanban across all of the user's projects.
Today we only have `/api/v1/phases/:id/tasks` which is per-phase.
Walking every project -> every phase -> every task list would be
expensive and violates the "lightweight" rule.

Add one endpoint:

```txt
GET /api/v1/me/tasks?limit=100&priority=...
  -> { tasks: TaskSummary[] }
```

Optional query params:

```txt
limit       - default 100, max 200
priority    - "low" | "medium" | "high" | "backlog" - filter to one column
isCompleted - true | false - exclude or include done
```

Server implementation: query phases by user's owned + collaborator
projects (existing pattern), then tasks by phase, paginate by `updatedAt`
desc. We keep this simple for v1 - if it gets slow we add a
`tasks.by_user` denormalised index later.

### Renderer wiring

`apps/user-application/src/hooks/desktop-api/useUserTasksQuery.ts` (new file):

```ts
export function useUserTasksQuery(filters?: {
  priority?: TaskPriority | "backlog";
  limit?: number;
}) { ... }
```

Plus barrel export update.

`apps/user-application/src/tasks/components/TasksPageView.tsx`:

```txt
- Drop the existing mock list.
- Call useUserTasksQuery() with limit 100, no priority filter.
- Group on the renderer:
    high     -> High Priority column
    medium   -> Medium Priority column
    low      -> Low Priority column
    null     -> Backlog column
- Loading / empty / error states (same pattern as ProjectsOverviewView).
```

The user can later add a "Set priority" mutation; out of scope for v1
unless we want it now.

### Migration of existing data

```txt
None needed. The field is optional. Existing rows keep working.
The desktop UI shows them in Backlog until someone sets a priority.
```

---

## Part 3 - Types and Zod policy

### Where each kind of type belongs

| Kind | Where | Why |
|---|---|---|
| Zod schemas for /api/v1 request/response payloads | `packages/data-ops/src/contracts/desktop-api/<resource>.ts` | Shared between server and desktop; both sides validate. |
| Zod schemas for IPC payloads / desktop session / engine status / permissions | `apps/user-application/shared/models/desktop.ts` | Cross-process boundary inside the desktop app. Validation prevents preload <-> main drift. |
| Pure TypeScript type for the `window.stageDesktop` ambient surface | `apps/user-application/src/types/stage-desktop.d.ts` | This is a TS-only declaration, not runtime data. Zod adds nothing. |
| Pure TypeScript types for renderer-internal models (route search params, view state, props) | Co-located with the component, or `apps/user-application/src/<feature>/types/` if reused across files in the feature. | Internal-only, no I/O boundary. Zod is overkill. |
| Pure TypeScript types for module augmentation (vite assets etc.) | `apps/user-application/src/types/<thing>.d.ts` | Ambient declarations only ever live as `.d.ts`. |

### Rule of thumb

```txt
If the value crosses a process boundary (network, IPC, deep link, file)
  -> Zod schema, infer the type from the schema.
If the value lives entirely inside one process and one render tree
  -> plain TypeScript type, no Zod.
```

### Folder convention

```txt
apps/user-application/
  src/
    types/                              # ambient .d.ts only (window, vite assets)
    <feature>/
      types/                            # plain TS types reused inside the feature
        <thing>.ts                      # one type / closely-related types per file
        index.ts
      models/                           # Zod schemas + inferred types for <feature>
        <thing>.ts
        index.ts
  shared/
    models/                             # Zod schemas crossing IPC (desktop session, etc.)
      desktop.ts
    ipc/
      channels.ts                       # IPC channel names

packages/data-ops/
  src/
    contracts/<family>/<resource>.ts    # Zod schemas crossing network
    domain/<concept>.ts                 # higher-level domain models
```

### Action items in this pass

```txt
1. The current setup already follows this rule. Do NOT move existing
   files just to satisfy a folder name.

2. apps/user-application/src/types/stage-desktop.d.ts is correct as-is
   (ambient Window typing). Keep it.

3. apps/user-application/shared/models/desktop.ts is correct as-is
   (Zod for IPC). Keep it.

4. apps/web-application/src/routes/auth.desktop.tsx local
   `DesktopAuthSearch` type stays inline. TanStack Router's
   validateSearch already provides runtime validation; adding Zod
   there would duplicate work without benefit.

5. New types added in this pass MUST follow the table above. Concrete:
   - `TaskPriority` -> Zod schema in
     packages/data-ops/src/contracts/desktop-api/task.ts (network).
   - `useUserTasksQuery` filters arg -> plain TS type next to the hook
     in src/hooks/desktop-api/useUserTasksQuery.ts (renderer-internal).
   - Refresh-token additions -> Zod in shared/models/desktop.ts
     (IPC + safeStorage boundary).
```

---

## Implementation order

If user gives "go", do in this order in a single session:

```txt
1. Stopgap: convex/auth.ts JWT durationMs change. Deploy to testing.
   Verify next login lasts 30 days by inspecting JWT exp claim.

2. 401 retry + refresh-token plumbing (Part 1, Layer 2).
   Order within this:
     a) shared/models/desktop.ts schema additions (refresh fields)
     b) electron/desktop-api/tokenRefresh.ts (single in-flight promise)
     c) electron/helpers/desktop-api.ts retry-once-on-401
     d) apps/web-application/src/routes/auth.desktop.tsx refresh-token
        handoff (after verifying how to read the refresh token from
        Convex Auth's client - see open question above)
     e) apps/user-application/electron/auth.ts handles refresh_token
        in the callback payload

3. Tasks priority (Part 2):
     a) convex/schema.ts add field
     b) convex/domain/projects/apiReadModel.ts return priority
     c) convex/api/index.ts + new routes/me.ts -> GET /api/v1/me/tasks
     d) packages/data-ops contract update + pnpm install
     e) src/hooks/desktop-api/useUserTasksQuery.ts
     f) src/tasks/components/TasksPageView.tsx wire to live data

4. Verify (typecheck + build + manual test in Electron).

5. Append "Implementation log (2026-05-10 pass 1)" section to this doc.
   Update apps/user-application/docs/05-09/05-09-monorepo-implementation-tracker.md
   to reflect Step 23 progress on logout / token refresh.
```

---

## Verification checklist (after implementation)

```txt
[ ] packages/data-ops    pnpm run typecheck
[ ] apps/user-application pnpm run typecheck
[ ] apps/user-application pnpm run build
[ ] apps/web-application pnpm run typecheck
[ ] apps/web-application pnpm run build:testing
[ ] cd apps/web-application && pnpm exec convex deploy   (testing)
[ ] Manual: log in fresh, hit several pages, all live data renders
[ ] Manual: artificially clear session, navigate, confirm UI shows
    "Sign in" empty state and does NOT spam 400s
[ ] Manual: wait for token expiry (or kill it server-side), trigger
    a fetch, confirm one 401 -> refresh -> retry -> success in logs
[ ] Manual: revoke refresh token server-side, trigger a fetch,
    confirm one 401 -> refresh fails -> session cleared -> UI shows
    "Sign in"
[ ] Tasks kanban renders 4 columns with real priority distribution
[ ] Existing priority-less tasks all appear in Backlog
```

---

## Out of scope for this pass (explicitly)

```txt
- Logout button. Step 23 stabilization item; can be added in the same
  pass if quick (10 min) but is not REQUIRED for token refresh to work.
- Mutation to set / change task priority from the desktop UI. The
  schema and read path support it; the write path can land separately.
- Direct realtime Convex subscriptions on the desktop. Still deferred.
- Provider runner / file scanner / Figma / Notion. Same as 05-09.
- Renaming or moving existing files just to fit a tidier folder name.
  The current /types vs /shared/models vs /contracts split is correct;
  we keep it.
```

---

## Open questions to confirm before coding

```txt
1. Convex Auth React client: is there a supported public way to read
   the current refresh token? If yes, use it. If no, add a small
   server-side helper query to return it for the signed-in user.
   Decide before writing the web handoff change.

2. /api/v1/me/tasks - acceptable to walk projects -> phases -> tasks
   for v1, or do we want the by_user index now? Default: walk for v1,
   add the index when we see real load.

3. Logout button in this pass: yes or no. Adds ~10 minutes; gives
   the user a manual "force re-login" without going through the
   filesystem rm. Default proposal: YES.
```

Awaiting "go" before any code change.

---

## Implementation log (2026-05-10 pass 1)

User said "go" with explicit constraints:

```txt
- Keep the code clean.
- Use helpers / Zod where it crosses a boundary.
- Follow the convex-setup-auth skill.
- Update apps/user-application/docs.
```

What landed:

### A. Stopgap - JWT lifetime extended to 30 days

```txt
apps/web-application/convex/auth.ts
  Added jwt: { durationMs: DESKTOP_JWT_DURATION_MS } where
  DESKTOP_JWT_DURATION_MS = 30 days.

  Verified the option name against the @convex-dev/auth/server type
  declarations (jwt.durationMs, default 1 hour). Refresh-token /
  session lifetime stays on the 30-day default in
  session.totalDurationMs.

  IMPORTANT: this only affects new tokens minted AFTER convex deploy.
  Existing 1-hour tokens still expire at their original time.
  Required deploy step (manual, by user):
    cd apps/web-application
    pnpm run testing:deploy   # or: npx wrangler deploy -e testing
                              # plus: convex deploy for the testing
                              #       deployment if convex/auth.ts
                              #       changed
```

### B. 401 / 403 detector and clean session-expired UX

New file:

```txt
apps/user-application/electron/desktop-api/auth-failure.ts
  - isAuthFailureStatus(status)        - returns true for 401 or 403.
                                          400 deliberately excluded.
  - DesktopSessionExpiredError class   - distinct error type so callers
                                          can render "Sign in" UX
                                          rather than a generic error.
  - clearSessionAndNotify(controller)  - clears safeStorage session AND
                                          broadcasts auth:session-changed
                                          with null payload so all
                                          renderer windows drop to the
                                          signed-out state.
```

Refactor:

```txt
apps/user-application/electron/helpers/desktop-api.ts
  fetchDesktopApiJson signature changed:
    BEFORE: { accessToken: string, path: string }
    AFTER:  { authController: DesktopAuthController, path: string }

  The helper now owns:
    1. token retrieval from the cached session (throws "session not
       connected" if missing - same semantics as the old
       requireDesktopAccessToken)
    2. 401/403 detection -> clearSessionAndNotify -> throw
       DesktopSessionExpiredError
    3. generic non-2xx -> "Stage API request failed with N"

  Resource fetchers (desktop-api/projects.ts, phases.ts, tasks.ts) and
  electron/project-context.ts updated to the new signature. Removed
  electron/desktop-api/client.ts (the old requireDesktopAccessToken)
  because the helper now handles that responsibility centrally.

  electron/project-context.ts wraps its calls in try/catch and treats
  DesktopSessionExpiredError as "fall back to no context" so the
  dashboard gracefully shows the empty state.
```

Result: when the JWT expires, the app no longer spams 400/401 errors
in a loop. One failed request triggers a session clear, the renderer's
auth:session-changed listener fires, and TanStack Query invalidates the
api cache. The Projects, Tasks, Project detail, and Client Portal
pages all already render the "Sign in" empty state on null session.

### C. Tasks priority field (enum) and live kanban

Schema:

```txt
apps/web-application/convex/schema.ts
  + const taskPriority = v.union(low, medium, high)
  + tasks.priority?: taskPriority
  Existing tasks have no priority -> rendered in Backlog column.
```

Read model:

```txt
apps/web-application/convex/domain/projects/apiReadModel.ts
  buildApiTaskSummary now returns:
    + priority: TaskPriority | null
    + projectId: string         (NEW - joined from phase doc; throws
                                 if the phase is missing because that
                                 would be a data-integrity bug)
  The phase fetch is added to the existing Promise.all so it does not
  serialize requests.
```

Internal query and HTTP route:

```txt
apps/web-application/convex/domain/projects/service.ts
  + listUserTasksForApi(userId, limit?)
    - walks owned projects -> phases -> tasks
    - sorts by updatedAt desc, slices to limit (default 100, cap 200)
    - returns buildApiTaskSummary[] (Promise.all)

  Scope is "owned" only for v1. Collaborator-shared projects come
  later when the desktop UX surfaces team tasks separately.
  If this gets slow we add a denormalised tasks.by_user index.

apps/web-application/convex/api/routes/me.ts (NEW)
  GET /api/v1/me/tasks?limit=N
    - Hono sub-app with zValidator("query", userTasksQuerySchema)
    - Calls authenticateApiKey, then runQuery the internal query.

apps/web-application/convex/api/index.ts
  + app.route("/api/v1/me", createMeRoutes())
  Hono allows the existing app.get("/api/v1/me", ...) identity handler
  and the sub-app to coexist because their paths differ.
```

Contract:

```txt
packages/data-ops/src/contracts/desktop-api/task.ts
  + taskPrioritySchema = z.enum(["low","medium","high"])
  + taskSummarySchema.priority   = taskPrioritySchema.nullable()
  + taskSummarySchema.projectId  = z.string().min(1)
  + export type TaskPriority

  Re-exported through contracts/desktop-api/index.ts and
  packages/data-ops/src/index.ts (already re-exports the folder
  barrel).
```

Electron desktop-api:

```txt
apps/user-application/electron/desktop-api/tasks.ts
  + listUserTasks(authController, args?: { limit?: number })
    - validates args with userTasksQuerySchema (Zod) before building
      the query string
    - returns TaskSummary[] parsed by tasksResponseSchema

  Public surface re-exported from desktop-api/index.ts.

apps/user-application/shared/ipc/channels.ts
  + desktopApiListUserTasks: "desktop-api:list-user-tasks"

apps/user-application/electron/ipc.ts
  + ipcMain.handle for desktopApiListUserTasks
    - permissive guard on the args payload: accepts undefined or
      { limit: number }; the Zod schema in tasks.ts is the source of
      truth for max values.

apps/user-application/electron/preload.ts
  + window.stageDesktop.api.listUserTasks(args?)

apps/user-application/src/types/stage-desktop.d.ts
  + listUserTasks signature added to StageDesktopApi.api
```

Renderer:

```txt
apps/user-application/src/hooks/desktop-api/useUserTasksQuery.ts (NEW)
  Single-purpose hook. Re-validates the IPC payload with z.array
  (taskSummarySchema) before returning to the component. Cache key
  includes limit so different limits cache separately.

apps/user-application/src/hooks/desktop-api/index.ts
  + export useUserTasksQuery, type UseUserTasksQueryArgs

apps/user-application/src/tasks/helpers/priorityColumns.ts (NEW)
  Pure helpers (no React) so the page component stays small:
    PRIORITY_COLUMNS, TaskPriority, PriorityTask, PriorityColumns
    emptyPriorityColumns()
    indexProjectsById(projects)
    buildPriorityColumns(tasks, projectsById)
      - groups by task.priority
      - null priority -> Backlog
      - joins each task to its project via projectId for the
        projectName + projectLogoUrl shown on the card

apps/user-application/src/tasks/components/TasksPageView.tsx
  - Removed import of mockProject and the local buildTaskColumns()
    that fabricated priority via PRIORITY_SEQUENCE.
  - Calls useUserTasksQuery({ limit: 100 }) and useProjectsQuery().
  - liveColumns memoised on the query data; setColumns synced via
    useEffect so the existing drag-and-drop state still functions
    locally. Persisting drag results requires a future
    POST /api/v1/tasks/:id/priority mutation; that is out of scope.
  - Empty state: when both queries finish with no tasks the kanban
    renders empty columns. Loading/error UX is handled by the queries
    being idle until WorkspaceFrame's auth flow sets a session;
    matches the pattern used on Projects, Project detail, Client
    Portal.
  - The "fake content paragraph" is gone. TaskSummary does not carry
    body content; the kanban card shows title + project label only.
    Full description still lives behind the existing /tasks/$taskId
    detail route.
```

### D. Types & Zod policy

Documented in this same doc under "Part 3 - Types and Zod policy".
No file moves were made; existing layout already complies. New files
in this pass follow the rule:

```txt
- task.priority enum                 -> Zod, in data-ops (network).
- listUserTasks args (limit)         -> Zod, in electron tasks.ts
                                        (IPC + outgoing query string).
- useUserTasksQuery args             -> plain TS, internal-only.
- DesktopSessionExpiredError         -> plain class, no Zod (no I/O).
- priorityColumns helpers            -> plain TS, internal-only.
```

### Verification (2026-05-10 pass 1)

```txt
packages/data-ops          pnpm run typecheck      PASS
apps/user-application      pnpm run typecheck      PASS
apps/user-application      pnpm run build          PASS  (723 modules)
apps/web-application       pnpm run typecheck      PASS
apps/web-application       pnpm run build:testing  PASS
```

Manual steps still required by the user:

```txt
1. Deploy the testing Convex deployment so jwt.durationMs (30 days)
   takes effect:
     cd apps/web-application
     # whichever script your testing deploy uses; convex/auth.ts
     # changes need a Convex deploy, not just a Cloudflare worker
     # deploy. From 05-09 docs: pnpm run testing:deploy plus convex
     # deploy for the testing deployment.

2. Sign out + back in to mint a 30-day JWT.
   (Existing 1-hour tokens still expire at their original time.)

3. Test the kanban: existing tasks should all appear in the Backlog
   column. Set a few priorities directly in Convex (or via the future
   mutation) to verify they land in the right columns.
```

## Implementation log (2026-05-10 pass 2 - logout)

User reported: "When I try to log out it doesn't work." The Log out
button in the sidebar user menu was bound to a function that only
closed the menu - it did nothing else. No IPC, no session clear, no
navigation.

### Single source of truth for sign-out

```txt
apps/user-application/electron/auth.ts
  + DesktopAuthController.signOut(): Promise<void>
    Calls clearSession() AND broadcasts auth:session-changed: null to
    every renderer window. One method used by both the manual Log out
    button and the automatic 401 / 403 clear path.

apps/user-application/electron/desktop-api/auth-failure.ts
  clearSessionAndNotify(authController) is now a one-line wrapper
  around authController.signOut(). The two paths share one codepath
  so renderer behaviour after manual logout and after token expiry
  is identical.
```

### Wiring

```txt
apps/user-application/shared/ipc/channels.ts
  + authLogout: "auth:logout"

apps/user-application/electron/ipc.ts
  + ipcMain.handle(authLogout, () => authController.signOut())

apps/user-application/electron/preload.ts
  + window.stageDesktop.auth.logout(): Promise<void>

apps/user-application/src/types/stage-desktop.d.ts
  + logout: () => Promise<void>

apps/user-application/src/dashboard/components/StageSidebar.tsx
  - logOut() that only closed the menu
  + async logOut() that:
      - guards re-entry with isLoggingOut state
      - calls desktop.auth.logout()
      - closes the user menu
      - navigates back to "/"
      - logs and recovers on failure
  Button shows "Logging out…" while in flight and is disabled.
```

### Why no manual TanStack Query invalidate in the sidebar

```txt
The session-changed listeners in WorkspaceFrame and the
useDesktopApiInvalidation hook already invalidate
["desktop","auth","session"], ["desktop","project-context","selected"],
and ["desktop","api","*"] when auth:session-changed fires. signOut()
emits exactly that event with null, so renderer queries refetch and
all live data pages drop to their existing "Sign in" empty state
without any extra renderer-side work.
```

### Verification (2026-05-10 pass 2)

```txt
apps/user-application      pnpm run typecheck      PASS
apps/user-application      pnpm run build          PASS  (723 modules)
```

## Implementation log (2026-05-10 pass 3 - tasks: delete, add, drag-persist)

User reported three concrete bugs:

```txt
1. Cannot delete a task from the kanban.
2. Add Task does not actually create a task (modal accepted input but
   nothing landed).
3. Drag-and-drop a task to a different priority column doesn't survive
   a reload.
```

All three required write paths that did not exist on the API. The
priority field added in pass 1 had no mutation; the create endpoint
needed a project-scoped variant; delete had no API-key gateway.

### Backend

```txt
apps/web-application/convex/domain/projects/service.ts
  + setTaskPriorityForUser(ctx, { userId, taskId, priority })
      Patches `task.priority`. priority === null clears the field
      (returns the task to Backlog).
  + deleteTaskForUser(ctx, { userId, taskId })
      Mirrors the existing `tasks.deleteById` mutation but is gated by
      userId rather than ctx.auth identity (so it works through the
      desktop API key path). Cascades attachments (R2 + storage),
      re-orders remaining tasks in the phase, recomputes project state.

  + createProjectTaskForApi   (internalMutation)
      Auto-targets the active phase, falling back to the lowest-order
      phase. Accepts optional priority + content. Throws if the
      project has no phases.
  + setTaskPriorityForApi     (internalMutation)
  + deleteTaskForApi          (internalMutation)

  Imports: + deleteOldR2Asset (was missing for the cascade in delete).

apps/web-application/convex/api/routes/tasks.ts
  + POST   /api/v1/tasks                  (body: projectId, title, priority?, content?)
  + DELETE /api/v1/tasks/:id
  + POST   /api/v1/tasks/:id/priority     (body: priority: "low"|"medium"|"high"|null)
  All three use Hono zValidator with local Zod schemas.
```

### Electron + IPC + preload + types

```txt
apps/user-application/electron/helpers/desktop-api.ts
  Refactored fetchDesktopApiJson into a generic sendDesktopApi helper
  that supports any HTTP method + JSON body. Existing
  fetchDesktopApiJson is now a thin wrapper for GET. New
  postDesktopApiJson wrapper for POST. The 401 / 403 + session-clear
  behaviour is unchanged - it now applies to writes too, so a stale
  token while creating or deleting a task also drops the UI to the
  signed-out state cleanly.

apps/user-application/electron/desktop-api/tasks.ts
  + createTask(authController, args)
  + setTaskPriority(authController, args)
  + deleteTask(authController, taskId)
  Each takes a Zod-validated args object. Returns parsed TaskSummary
  (or { ok: true } for delete).

apps/user-application/shared/ipc/channels.ts
  + desktopApiCreateTask, desktopApiDeleteTask, desktopApiSetTaskPriority

apps/user-application/electron/ipc.ts
  + ipcMain.handle for each. Permissive guards on the args payload;
    the Zod schema in tasks.ts is the source of truth for shape.

apps/user-application/electron/preload.ts
  + window.stageDesktop.api.createTask(args)
  + window.stageDesktop.api.deleteTask(taskId)
  + window.stageDesktop.api.setTaskPriority(args)

apps/user-application/src/types/stage-desktop.d.ts
  Matching ambient signatures, importing TaskPriority from data-ops.
```

### Renderer

```txt
apps/user-application/src/hooks/desktop-api/useTaskMutations.ts (NEW)
  TanStack Query mutation hooks:
    useCreateTaskMutation()
    useDeleteTaskMutation()
    useSetTaskPriorityMutation()
  Each parses the response with the matching Zod schema and invalidates
  the entire ["desktop","api"] cache on success so the user-tasks
  query, the per-phase query, and the project-detail aggregate all
  refresh.

apps/user-application/src/hooks/desktop-api/index.ts
  Re-exports the three new hooks + their input types.

apps/user-application/src/tasks/components/CreateTaskDialog.tsx (NEW)
  Purpose-built "Create Task" dialog for the live Tasks page:
    - takes ProjectSummary[] as props (live projects from the page)
    - title input + optional description
    - project picker (filtered list of live projects)
    - priority picker (Backlog / Low / Medium / High)
    - submit button disabled until title + project chosen
    - calls useCreateTaskMutation internally; renders inline error
    - closes itself on success
  Old CreateTaskModal in TasksPageView is intentionally NOT removed -
  it's still used by KanbanBoard on the project-detail page (mock
  flow, separate concern). New file keeps the live and mock
  flows from contaminating each other.

apps/user-application/src/tasks/components/TasksPageView.tsx
  Removed the local createTask() that prepended a fake task to the
  Backlog column. Replaced the modal with <CreateTaskDialog>.

  moveTask now persists priority changes:
    - tracks the column the task came from
    - on drop into a different column, fires
        setPriority.mutate({ taskId, priority: column === "backlog" ? null : column })
    - on mutation error, reverts local state to liveColumns

  New handleDeleteTask(taskId):
    - optimistic remove from local columns
    - fires deleteTask.mutate(taskId)
    - on error, restores previous columns

  PriorityTaskCard:
    + onDelete?: () => void prop
    + small × button, top-right, fades in on card hover; stops
      pointer/click propagation so it does not start a drag or open
      the task. Same pattern as ProjectsOverviewView "See Details".
```

### Backwards compatibility

```txt
KanbanBoard (project-detail page) still uses the legacy CreateTaskModal
exported from TasksPageView. That component continues to render the
old mock-driven create flow and is unaffected. The legacy types
TaskAssignee and TaskProject also stay exported from TasksPageView
because KanbanBoard imports them. Persisting that kanban's create
flow is queued for a follow-up; not required by the user's bug
report on the standalone Tasks page.
```

### Optimistic UX rules used here

```txt
- Drag move: update columns immediately, fire mutation, revert on error.
- Delete: remove immediately, fire mutation, restore on error.
- Create: rely on TanStack Query invalidation - the dialog closes,
  the user-tasks query refetches, the new task appears in its column.
  No optimistic insert because the server fills in createdAt /
  updatedAt / projectId join, and a flicker is preferable to showing
  a fake row that might get rewritten.
```

### Verification (2026-05-10 pass 3)

```txt
packages/data-ops          pnpm run typecheck      PASS
apps/user-application      pnpm run typecheck      PASS
apps/user-application      pnpm run build          PASS  (725 modules)
apps/web-application       pnpm run typecheck      PASS
```

### Manual deploy step required by user

```txt
The new mutations and HTTP routes need a Convex deploy to the testing
deployment before they are reachable from the desktop:
  cd apps/web-application
  pnpm run testing:deploy
  # convex deploy for the testing deployment if your testing:deploy
  # script does not already include it
After deploy, restart the desktop dev server (Electron main changes
do not hot-reload).
```

### What still ships separately (next pass)

```txt
1. Refresh-token rotation (Layer 2 of Part 1):
     - web hands off __convexAuthRefreshToken alongside the JWT
     - Electron stores both
     - tokenRefresh.ts module with single in-flight refresh promise
     - fetchDesktopApiJson retries once on 401 using the refresh token
   Reason for deferring: needs verification of how Convex Auth's
   public surface exposes the refresh token (we found it at
   __convexAuthRefreshToken in localStorage, but want a public hook
   if available). Plus the Electron side wants careful test coverage.

2. POST /api/v1/tasks/:id/priority mutation so drag-and-drop persists.
   Currently the kanban moves are local-only after a drop.

3. Logout button (Step 23 stabilization). 10-minute add, but not
   needed to make the 30-day stopgap usable.
```

