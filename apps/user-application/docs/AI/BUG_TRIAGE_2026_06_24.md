# Bug Triage — 2026-06-24

> **Scope:** Four open bugs surfaced from Notion tasks #33, #40, #45 plus a Dashboard gap.
> **Status:** Triage / research handoff. Fixes not yet started.
> **Read first:** `PROJECT_STATUS.md`, `ARCHITECTURE.md`, `apps/user-application/docs/AI/desktop/README.md`.

---

## Architecture (for the research AI)

```
Desktop (Electron) ──IPC──► stage-engine (Rust sidecar)
        │
        └── Convex (projects, tasks, portal, figmaExportJobs)

Client portal: Desktop preview + web `/portal/:token`
FigJam: FlowsTab → useFlowsFigJamExport → IPC → Rust FigmaExportService
        → Convex figmaExportJobs → Figma Exporter plugin
```

**Ponytail:** smallest diff only — one route change, no new abstractions.
**Rust focus:** `apps/stage-engine/src/server/exports.rs`, `exports/figma/service.rs`, repository layer.

---

## Bug overview

| # | Bug | What you see | Likely issue |
|---|-----|--------------|--------------|
| 40 | "See Details" should open main project view | Projects table (Limora) → See Details | Probably routes to `/project/$projectId/details` instead of `/project/$projectId` (main workspace) |
| 40 (result) | Wrong screen after click | BaseFrame Product Design — mock task detail (Pratik Singh, Overdue, Typography, Example.fig) | `ProjectDetailsView.tsx` still uses `mockProjectDetails` — not wired to Convex |
| 33 | Client portal not synced | Web portal Limora, 0%, phase tabs (Discovery 0/1, rest 0/0), task "Product Design Review" | Portal data out of sync with real project in Desktop/Convex |
| Dashboard | Partially empty | Upcoming / Activity / Pipeline have data; Revenue shows "Connect Stage to load live project data." | `buildDashboardRevenue(null)` is hardcoded — billing not wired; looks like a sync bug |
| 45 | Send to FigJam broken | Flows tab, 0/5 approved, error: engine:create-figjam-export → Stage Engine 400 | Desktop IPC → Rust stage-engine `/v1/exports/figjam` → Convex job; 400 = bad request somewhere |

---

## A — Bug #40: "See Details" → main project view

- [ ] Repro: Projects → Limora → See Details
- [ ] Check navigation: `ProjectsOverviewView.tsx` (~139–144) → `/project/$projectId/details`
- [ ] Expected: `/project/$projectId` → ProjectDetailView / ProjectStepView (Research, Strategy, Flows, …)
- [ ] Confirm: `ProjectDetailsView.tsx` uses `mockProjectDetails` (BaseFrame/Pratik) — not live data
- [ ] Clarify PM intent: "Details" = main workspace or separate detail screen?
- [ ] Row click vs button: row → `/project/$projectId`; button → `/details` — inconsistent?
- [ ] Client Portal table uses "Client Portal" button, not "See Details" — bug is likely Projects, not Client Portal
- [ ] After fix: test back nav (`setProjectBackDestination`) and deep links
- [ ] Ponytail: prefer 1-line route fix over new views

---

## B — Bug #33: Client portal not synced

- [ ] Open Limora in Desktop — note tasks, phases, progress %
- [ ] Desktop preview: `/client-portal/$projectId/preview` — same data?
- [ ] Web portal: share link from `useProjectShareLink` / `portal.ensureShareLink` → `/portal/:token`
- [ ] Convex: `portal.getByShareToken` → `buildProject()` in `packages/data-ops/convex/domain/projects/readModel`
- [ ] Compare: Desktop `useLiveProject` vs portal `buildProject` — same phase/completion logic?
- [ ] Where does `project.progress` come from? Does 0% match completed tasks?
- [ ] Phase counts (Discovery 0/1 vs 0/0): task → phase mapping, `isCompleted` correct?
- [ ] Portal config: `portalConfigs.isEnabled`, `shareToken`, correct `projectId`?
- [ ] Stale data: Convex dev running? Desktop resolving `@stage/data-ops` from source?
- [ ] Read: `apps/user-application/docs/AI/client-portal/CLIENT_PORTAL_INTEGRATION_AUDIT.md`
- [ ] Web `?preview=1` uses `getPortalPreviewData()` — mock, not Convex?
- [ ] Does "Product Design Review" exist in Convex for Limora or is it stale/mock?

---

## C — Dashboard: "Connect Stage…" / empty Revenue

- [ ] `DashboardContextView.tsx` passes `buildDashboardRevenue(null)` always
- [ ] `projectContextDashboard.ts`: no context → "Connect Stage to load live project data."
- [ ] Bug or intentional placeholder (billing not in desktop context)?
- [ ] Other widgets use `useProjectsQuery` / `useUserTasksQuery` — why is only Revenue empty?
- [ ] If revenue needed: where is billing data? Is there a `ProjectContext` with revenue fields?
- [ ] Chart also uses `buildDashboardChart(null, period)`
- [ ] PM call: hide card, change copy, or wire real data

---

## D — Bug #45: Send to FigJam → Engine 400

### Frontend / IPC
- [ ] Repro: Flows tab → Send to FigJam (does 0/5 approved matter?)
- [ ] `useFlowsFigJamExport.ts`: payload `{ projectId, artifactId }`
- [ ] `FlowsTab.tsx`: which `artifactRecord.id`? Does flows artifact exist?
- [ ] Electron `ipc.ts` → schema parse → POST `/v1/exports/figjam`
- [ ] Sidecar running? Auth token present?

### Rust engine
- [x] Logs: exact 400 message from `exports.rs` / `tracing::warn`
- [x] **Root cause found:** `repository.rs:73` sent `Value::from(expires_at)` (i64) → convex SDK encodes as `{"$integer":"..."}`; Convex schema `pairingExpiresAt: v.number()` (= `v.float64()`) rejects Int64 wire type.
- [x] **Fix:** `Value::from(expires_at as f64)` → sends `Float64` matching the schema. One line. Same `create_job` path serves wireframe + FigJam, so both fixed.
- [x] `cargo check` clean; figma tests pass. Pre-existing clippy errors in moodboard module are unrelated WIP.

### Convex / Figma plugin
- [ ] `figmaExportJobs`, handler `figmaJobs.ts`
- [ ] Figma integration connected in Settings?
- [ ] `apps/figma-exporter` — FigJam board open? pairing code flow
- [ ] `PROJECT_STATUS.md`: Export E2E still unverified

### Ponytail / Rust
- [ ] Fix root cause only; no speculative retry/cache layers
- [ ] `cargo test` + `clippy` on touched engine modules

---

## E — Cross-cutting

- [ ] Branch `fix/styleguide-durable-run` has unrelated moodboard WIP
- [ ] Convex dev + desktop dev running
- [ ] Export E2E + Convex deploy still open per `PROJECT_STATUS.md` (P3)
- [ ] Link Notion tasks #33, #40, #45 to repro + root cause
- [ ] Separate commits: navigation / portal sync / FigJam

---

## Handoff notes

- This doc is **current** (not archive). Update checkboxes as work lands.
- If a fix lands, move the resolved checklist block into the commit description and link the PR here.
- When all four are closed, move this file to `docs/archive/session-plans/` and drop a line in `PROJECT_STATUS.md`.
