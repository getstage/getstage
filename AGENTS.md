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
│   ├── R2_MIGRATION_FIXES.md
│   └── apps/user-application/docs/AI/
│       ├── desktop/               ← desktop ship (!!! plans + release)
│       ├── research|strategy|flows|moodboard|chatbot|...
│       └── infra|integrations|client-portal|assets|wireframes
│
└── IGNORE (not product)
    └── .agents/skills/, .claude/skills/   ← agent tooling
```

## Ignore unless asked

- Marketing / skills under `.agents/skills/` (not product code)

## Active !!! plans

- `apps/user-application/docs/AI/desktop/2026-06-07!!!-DESKTOP_IDLE_ENERGY_PLAN.md`
- `apps/user-application/docs/AI/desktop/2026-06-08!!!-PROJECT_OPERATING_PLAN.md`

## Rules

- Repo markdown for specs: **English**
- Chat with Werner: **German**
- Do not create new plan `.md` files without updating `PROJECT_STATUS.md`
- Prefer updating living docs over adding dated snapshot `.md` files
