# Stage — Project Status

> **Living document.** Update weekly (or before each release).  
> **Last updated:** 2026-06-14

---

## NOW (this week)

| Priority | Item | Owner / where |
|----------|------|----------------|
| **!!! P0** | Desktop idle energy P0 — PR `fix/desktop-idle-energy-p0` | `docs/AI/desktop/2026-06-07!!!-DESKTOP_IDLE_ENERGY_PLAN.md` |
| **P1** | Run packaged-DMG benchmark + 2 h soak (RAM < 400 MB, 12 hr power < 500) | `scripts/desktop-idle-benchmark.sh` |
| **P2** | IPC R2 upload (separate PR after energy gate) | `src/lib/r2Uploads.ts`, `electron/helpers/r2-upload.ts` |
| **P3** | Export E2E + Convex deploy | Notion live test, Figma plugin publish, Paper live write |
| **P1 local review** | Project-aware Stage chat: `@project`, bounded Convex context, screenshots, confirmed window capture | `apps/user-application/docs/AI/chatbot/CHATBOT_PLAN.md`; branch `feat/stage-chat-project-context-vision` |

**Current desktop version (work branch):** `0.1.70`

---

## Implemented in the current integration branch

- **Convex refactor sprint** — thin transport files, `convex/models/` + `convex/helpers/`, handlers in `convex/lib/`; see [Notion task](https://app.notion.com/p/37b8714fd55781078141d5d610317f14) and `packages/data-ops/convex/ARCHITECTURE.md`
- Notion research export embeds Refero UI pattern images (`v0.1.59`)
- Desktop v0.1.52–0.1.55 (auto-update, auth handoff, provider CLI detection)
- Desktop performance pass (sidecar defer, polling reduced)
- Global voice/chat shortcuts and Settings → Shortcuts
- Persistent Stage chat history and resizable chat panel
- Main-window companion routing; full-screen companion overlay removed
- Notion OAuth and Research/Strategy Notion export paths
- Assets delivery with Code, Paper, and Figma wireframe exports
- Editable FigJam flow export
- Dashboard / project / task UI improvements

---

## Current local review changes

- Project-aware Stage chat pins one `@project`, blocks ambiguous critique requests, loads bounded indexed Convex context, and supports local image upload/paste/drop plus confirmed window capture.
- Chat switching no longer corrupts last-modified history order.
- Chat persistence no longer performs side effects inside a React state updater.
- Streaming chat updates no longer synchronously persist every chunk.
- Duplicate list-item React keys are fixed.
- Shortcut registration now unregisters only shortcuts owned by its module.
- Shortcut defaults and cross-platform Ctrl handling are aligned.
- Legacy companion cleanup no longer destroys unrelated windows.
- Development can run without the production single-instance lock.
- Audit, Greptile, operating-plan, and energy-plan status is updated.

---

## Blockers

- [x] Baseline idle benchmark on **v0.1.56 DMG** (2026-06-09) — **FAIL** (expected before energy P0 merge)
- [ ] Re-benchmark **v0.1.57 DMG** (no chat in smoke) — must PASS
- [x] PR #5 (`fix/desktop-idle-energy-p0`) merged into `work`
- [x] PR #6 (chat projectId + IPC polish) merged into `work`
- [x] Tag **v0.1.57** pushed — GitHub Actions DMG build running
- [ ] Export destinations verified with live E2E tests

### Baseline benchmark v0.1.56 (Werner Mac, chat used in smoke)

| Metric | Result | Budget |
|--------|--------|--------|
| Peak RSS | **956 MB** | < 400 MB |
| Avg CPU (30 min) | **9.2%** | < 1% |
| `stage-engine` at end | **still running** | none |

Smoke included one chat session → engine stayed up (no idle shutdown in 0.1.56). Energy P0 PR targets this.

---

## Tooling map

| Tool | Job |
|------|-----|
| **Notion** | Tasks, bugs, client portal |
| **Datafa.st** | Production user analytics |
| **Greptile (Lumenapps)** | PR code review only |
| **GitHub `getstage/getstage`** | Code + releases |
| **This file + `ARCHITECTURE.md`** | Dev source of truth |
| **`docs/README.md`** | Doc map (CURRENT / ARCHIVE / IGNORE) |
| **`docs/archive/`** | Historical specs — not daily reading |

---

## Next release target

**v0.1.57** — merge PR #5 (energy P0) into `work`, rebuild DMG, re-run benchmark until PASS.  
**v0.1.56** — shipped (partner chat redesign); baseline FAIL above is the “before” proof.

---

## Links

- Operating plan: `docs/AI/desktop/2026-06-08!!!-PROJECT_OPERATING_PLAN.md` (repo root copy in `apps/user-application/docs/AI/desktop/` if moved)
- Architecture: `ARCHITECTURE.md`
- Desktop index: `apps/user-application/docs/AI/desktop/README.md`
- AI start: `AGENTS.md`
