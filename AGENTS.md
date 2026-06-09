# Agent / developer start here

## Read first (in order)

1. `PROJECT_STATUS.md` — what is live, blocked, and next
2. `ARCHITECTURE.md` — 4 apps, data flows, branches
3. `apps/user-application/docs/AI/desktop/README.md` — if touching desktop

Full doc map: [`docs/README.md`](docs/README.md)

## Documentation tree

```
stage_mvp/
├── CURRENT (read often)
│   ├── PROJECT_STATUS.md          ← start here
│   ├── ARCHITECTURE.md
│   ├── AGENTS.md
│   └── apps/user-application/docs/AI/
│       ├── desktop/               ← desktop ship (!!! plans + release)
│       ├── research|strategy|flows|moodboard|chatbot|...
│       └── infra|integrations|client-portal|assets|wireframes
│
├── ARCHIVE (history only)
│   └── docs/archive/
│       ├── session-plans/         ← was apps/user-application/docs/05-*, 30-05
│       ├── legacy/                ← was docs/pre, docs/frontend, docs/2026-*
│       └── ai-snapshots/          ← dated AI one-offs (04-06, 07-06, Greptile)
│
└── IGNORE (not product)
    └── .agents/skills/, .claude/skills/   ← agent tooling
```

## Ignore unless asked

- `docs/archive/` — historical specs and session plans
- Marketing / skills under `.agents/skills/` (not product code)

## Active !!! plans

- `apps/user-application/docs/AI/desktop/2026-06-07!!!-DESKTOP_IDLE_ENERGY_PLAN.md`
- `apps/user-application/docs/AI/desktop/2026-06-08!!!-PROJECT_OPERATING_PLAN.md`

## Rules

- Repo markdown for specs: **English**
- Chat with Werner: **German**
- Do not create new plan `.md` files without archiving or updating `PROJECT_STATUS.md`
- New dated snapshots → `docs/archive/ai-snapshots/`
- New session plans → `docs/archive/session-plans/`
