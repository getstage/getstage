# `loop/` — the loops' operating record

This directory is the **filesystem half of Notion** — the durable, git-tracked record of every autonomous loop run. Notion is the operating system for *information*; `loop/` is its source of truth in the repo, and the two stay in sync (run → `loop/runs/…` → pushed to a Notion entry).

Design & rules: `../AUTONOMOUS_LOOPS_PLAN.md`.

## Layout
```
loop/
  README.md         ← you are here
  MAINTAINABLE.md   ← living backlog the maintainable loop eats from
  runs/             ← one file per loop run (the journal)
    _TEMPLATE.md
  findings/         ← issues DISCOVERED mid-run (new errors, drift)
    _TEMPLATE.md
```

## How a run flows
1. Loop picks an item (from `MAINTAINABLE.md` or a Notion task/bug) → creates the execution plan → **human approves**.
2. Works in an **isolated worktree** (never the main checkout).
3. Runs the full gate (typecheck · cargo test · e2e · visual · maintainability greps).
4. **Verifier** (Opus 4.8 high → GPT-5.5 high fallback) refutes; iterates on the fix-list.
5. Writes `runs/RUN-YYYY-MM-DD-<slug>.md` (the journal + handoff).
6. **Opens a PR** → Greptile reviews → **human merges** → human cuts the tag.

## New findings → feed the system (your "update files then" idea)
When a run uncovers something *outside* its scope (a new error, a regression risk, drift):
- It writes `findings/FIND-YYYY-MM-DD-<slug>.md`,
- **appends a checkbox to `MAINTAINABLE.md` → "Discovered during loops"**,
- and pushes the same entry to Notion.

So findings are never lost: they become tracked backlog items, not silent TODOs.

## Can findings/journal be pushed as a PR? — **Yes.**
`loop/` files are just tracked files. Two clean options:
- **Ride-along:** the run's journal + any `MAINTAINABLE.md`/`findings/` updates are committed **on the same branch** as the code change, so they land in that PR.
- **Docs-only PR:** if a run *only* discovers things (no code change), it opens a tiny **`chore(loop): findings` PR** touching only `loop/` — safe, no app code, Greptile-light.
Either way: same rules — PR only, never a direct push to `main`.

## Conventions
- Run files are **append-only history** — never edited after the run closes.
- Commit messages: `chore(loop): RUN-<id> <summary>` and reference the Notion id.
- Dates are absolute (`YYYY-MM-DD`).
