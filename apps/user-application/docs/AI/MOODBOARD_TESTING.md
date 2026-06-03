# Moodboard E2E testing (placeholder)

> **Plan & scope:** [`MOODBOARD_DEV_STATUS.md`](./MOODBOARD_DEV_STATUS.md) — **Dan review required** before this checklist is finalized.

---

## Status

Moodboard engine is **not connected**. Do not use this doc for production QA yet.

When Phase 2 in `MOODBOARD_DEV_STATUS.md` ships, this file will be filled out to match [`STRATEGY_TESTING.md`](./STRATEGY_TESTING.md):

- Terminals + port 48221
- Prerequisites (Research + Strategy on same project)
- Upload → direction → generate style guide
- Convex tables + success log lines
- Regenerate + upstream stale banner
- Downstream “Clear later steps” after full moodboard regen

---

## Draft smoke test (manual, post-Phase 2)

1. Project with completed **Research** and **Strategy**
2. Moodboard tab → upload at least 2 images → assign to a direction
3. **Generate style guide** → loading state → style guide view with project-specific palette/typography
4. Reload app → artifact still present
5. Re-run **Strategy** on same project → moodboard **unchanged** until user clears via dialog
6. Regenerate style guide on one direction → only that direction’s guide updates
