# Stage — Project Status

> **Living document.** Update weekly (or before each release).  
> **Last updated:** 2026-06-08

---

## NOW (this week)

| Priority | Item | Owner / where |
|----------|------|----------------|
| **!!! P0** | Desktop idle energy fix (Adrien: 5636 energy, 18 GB swap) | `docs/AI/desktop/2026-06-07!!!-DESKTOP_IDLE_ENERGY_PLAN.md` |
| **P1** | Keep `work` in sync after merges (`monorepo` OK too) | See operating plan §Git |
| **P2** | Uncommitted laptop work: voice shortcuts + Stage chat | `work` branch, not pushed yet |
| **P3** | Export E2E + Convex deploy (if export branch merged) | Notion live test, Figma plugin publish |

**Current desktop version (work branch):** `0.1.55`

---

## Shipped on `work` (ahead of `monorepo`)

- Desktop v0.1.52–0.1.55 (auto-update, auth handoff, provider CLI detection)
- Desktop performance pass (sidecar defer, polling reduced)
- Notion export UI: Research + Strategy (Convex handlers exist)
- Dashboard / project / task UI improvements

---

## Uncommitted on this laptop (`work`)

- Stage chat model + `stageChats` persistence
- Global voice/chat shortcuts (`electron/voice/shortcuts.ts`, Settings → Shortcuts)
- Companion overlay → main-window shortcuts refactor (`electron/windows.ts`)
- `2026-06-07!!!-DESKTOP_IDLE_ENERGY_PLAN.md` + desktop doc index updates

---

## Blockers

- [ ] Idle energy benchmark PASS on DMG (terminal test in energy plan)
- [ ] `work` pushed and merged to `monorepo` on iMac without conflict
- [ ] Export features: verify what is committed vs local-only (see operating plan)

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
