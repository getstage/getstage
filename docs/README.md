# Stage documentation map

> **Living status:** [`PROJECT_STATUS.md`](../PROJECT_STATUS.md) (repo root)  
> **Start here for agents:** [`AGENTS.md`](../AGENTS.md)

---

## Tree

```
stage_mvp/
├── CURRENT (read often)
│   ├── PROJECT_STATUS.md          ← start here
│   ├── ARCHITECTURE.md
│   ├── AGENTS.md
│   ├── R2_MIGRATION_FIXES.md      ← R2 upload/delete rules
│   └── apps/user-application/docs/AI/
│       ├── desktop/               ← desktop ship (!!! plans + release)
│       ├── research|strategy|flows|moodboard|chatbot|...
│       └── infra|integrations|client-portal|assets|wireframes
│
├── ARCHIVE (history only)
│   └── docs/archive/
│       ├── session-plans/         ← May 2025 monorepo/auth sessions (was docs/05-*, 30-05)
│       ├── legacy/                ← pre-AI specs (was docs/pre, docs/frontend, docs/2026-*)
│       └── ai-snapshots/          ← dated one-offs (04-06, 07-06, Greptile fixes)
│
└── IGNORE (not product)
    └── .agents/skills/, .claude/skills/   ← agent tooling
```

---

## CURRENT — file index

### Repo root

| File | Purpose |
|------|---------|
| [`PROJECT_STATUS.md`](../PROJECT_STATUS.md) | Version, blockers, this week |
| [`ARCHITECTURE.md`](../ARCHITECTURE.md) | 4 apps, data flows, branches |
| [`AGENTS.md`](../AGENTS.md) | Agent/dev entry point |
| [`R2_MIGRATION_FIXES.md`](../R2_MIGRATION_FIXES.md) | R2 storage migration rules |
| [`BUILDPLAN.md`](../BUILDPLAN.md) | Full product vision (reference, not sprint status) |

### Desktop (`apps/user-application/docs/AI/desktop/`)

| File | Purpose |
|------|---------|
| [`README.md`](../apps/user-application/docs/AI/desktop/README.md) | Desktop doc index |
| [`2026-06-08!!!-PROJECT_OPERATING_PLAN.md`](../apps/user-application/docs/AI/desktop/2026-06-08!!!-PROJECT_OPERATING_PLAN.md) | How we work (Notion, git, Greptile, releases) |
| [`2026-06-07!!!-DESKTOP_IDLE_ENERGY_PLAN.md`](../apps/user-application/docs/AI/desktop/2026-06-07!!!-DESKTOP_IDLE_ENERGY_PLAN.md) | Idle energy P0, terminal benchmark |
| [`DESKTOP_PERFORMANCE.md`](../apps/user-application/docs/AI/desktop/DESKTOP_PERFORMANCE.md) | Performance, bugs, IPC backlog |
| [`P1_FOCUS_ITEMS.md`](../apps/user-application/docs/AI/desktop/P1_FOCUS_ITEMS.md) | Current desktop focus |
| [`DESKTOP_RELEASE_AND_TESTING_PLAN.md`](../apps/user-application/docs/AI/desktop/DESKTOP_RELEASE_AND_TESTING_PLAN.md) | DMG release phases |
| [`RELEASE_DESKTOP_STEPS.md`](../apps/user-application/docs/AI/desktop/RELEASE_DESKTOP_STEPS.md) | Release steps |
| [`PUSH_AND_BUNDLE_DESKTOP_RELEASE.md`](../apps/user-application/docs/AI/desktop/PUSH_AND_BUNDLE_DESKTOP_RELEASE.md) | Push + bundle |

### AI features (`apps/user-application/docs/AI/<area>/`)

| Area | Key files |
|------|-----------|
| **research/** | `RESEARCH_DEV_STATUS`, `RESEARCH_TESTING`, `RESEARCH_PRODUCT_REQUIREMENTS`, `STAGE_AI_RESEARCH_HANDOFF` |
| **strategy/** | `STRATEGY_DEV_STATUS`, `STRATEGY_TESTING` |
| **flows/** | `FLOWS_DEV_STATUS`, `FLOWS_TESTING`, `FLOWS_CHANGE_AUDIT` |
| **moodboard/** | `MOODBOARD_DEV_STATUS`, `MOODBOARD_TESTING`, `MOODBOARD_BUILD_PLAN`, `MOODBOARD_CHANGE_AUDIT`, `STAGE_RELIABILITY_RECOVERY_PLAN` |
| **chatbot/** | `CHATBOT_PLAN` |
| **client-portal/** | `CLIENT_PORTAL_INTEGRATION_AUDIT` |
| **assets/** | `FIGMA_WIREFRAME_EXPORT_PLAN` |
| **wireframes/** | `WIREFRAMES_BUILD_PLAN` |
| **infra/** | `R2_PUBLIC_DOMAIN_AUDIT`, `R2_STORAGE_CHANGE_AUDIT` |
| **integrations/** | `NOTION_INTEGRATION` |

### Cross-cutting AI

| File | Purpose |
|------|---------|
| [`STAGE_AI_WORKFLOW_CONTEXT_PLAN.md`](../apps/user-application/docs/AI/STAGE_AI_WORKFLOW_CONTEXT_PLAN.md) | AI workflow project context |
| [`VOICE_CHATGPT_CODEX_BRIDGE_PLAN.md`](../apps/user-application/docs/AI/VOICE_CHATGPT_CODEX_BRIDGE_PLAN.md) | Voice + Codex bridge |

### App READMEs

| File | Purpose |
|------|---------|
| [`apps/stage-engine/README.md`](../apps/stage-engine/README.md) | Rust sidecar |
| [`apps/stage-engine/ARCHITECTURE.md`](../apps/stage-engine/ARCHITECTURE.md) | Engine architecture |
| [`packages/data-ops/README.md`](../packages/data-ops/README.md) | Convex shared package |

---

## ARCHIVE — do not read daily

| Folder | Was | Contents |
|--------|-----|----------|
| [`archive/session-plans/`](./archive/session-plans/) | `apps/user-application/docs/05-*`, `30-05/` | May 2025 monorepo, auth, router, provider sessions |
| [`archive/legacy/`](./archive/legacy/) | `docs/pre/`, `docs/frontend/`, dated `docs/*.md` | Early screen specs, Accelero sync, MLP doc, handoffs |
| [`archive/ai-snapshots/`](./archive/ai-snapshots/) | Dated files under `AI/` | 04-06 kanban plans, 07-06 audit, Greptile PR fixes |

---

## IGNORE

| Location | Note |
|----------|------|
| `.agents/skills/`, `.claude/skills/` | Cursor/Claude agent skills — not Stage product docs |
| Stage-specific skills (optional): `stage-monorepo-architect`, `stage-project-manager`, `toyota-reliability`, `refero-mcp` |

---

## Quick rules

| Question | Answer |
|----------|--------|
| What's live / blocked? | `PROJECT_STATUS.md` |
| How is the system built? | `ARCHITECTURE.md` |
| Desktop ship / energy / DMG? | `AI/desktop/README.md` + `!!!` plans |
| How to build feature X? | `AI/<feature>/` DEV_STATUS + TESTING |
| Old May session notes? | `docs/archive/session-plans/` |
