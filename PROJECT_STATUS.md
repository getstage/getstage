# Stage — Project Status

> **Living document.** Update weekly (or before each release).  
> **Last updated:** 2026-06-09

---

## NOW (this week)

| Priority | Item | Owner / where |
|----------|------|----------------|
| **!!! P0** | Desktop idle energy P0 — PR `fix/desktop-idle-energy-p0` | `docs/AI/desktop/2026-06-07!!!-DESKTOP_IDLE_ENERGY_PLAN.md` |
| **P1** | Run packaged-DMG benchmark + 2 h soak (RAM < 400 MB, 12 hr power < 500) | `scripts/desktop-idle-benchmark.sh` |
| **P2** | IPC R2 upload (separate PR after energy gate) | `src/lib/r2Uploads.ts`, `electron/helpers/r2-upload.ts` |
| **P3** | Export E2E + Convex deploy | Notion live test, Figma plugin publish, Paper live write |

**Current desktop version (work branch):** `0.1.56`

---

## Implemented in the current integration branch

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

- [ ] Idle energy benchmark PASS on DMG (terminal test in energy plan)
- [ ] Integration branch merged into the final target branch
- [ ] Export destinations verified with live E2E tests

---

## Tooling map

| Tool | Job |
|------|-----|
| **Notion** | Tasks, bugs, client portal |
| **Datafa.st** | Production user analytics |
| **Greptile (Lumenapps)** | PR code review only |
| **GitHub `getstage/getstage`** | Code + releases |
| **This file + `ARCHITECTURE.md`** | Dev source of truth |
| **320+ `.md` files** | Archive / deep reference — not daily reading |

---

## Next release target

**v0.1.56** — idle energy P0 + shortcut/chat polish (after monorepo merge)

---

## Links

- Operating plan: `docs/AI/desktop/2026-06-08!!!-PROJECT_OPERATING_PLAN.md` (repo root copy in `apps/user-application/docs/AI/desktop/` if moved)
- Architecture: `ARCHITECTURE.md`
- Desktop index: `apps/user-application/docs/AI/desktop/README.md`
- AI start: `AGENTS.md`
