# RUN-YYYY-MM-DD-<slug>

- **Date:** YYYY-MM-DD
- **Type:** maintainable | feature
- **Source:** MAINTAINABLE.md item | NOTION-<id>
- **Builder model:** <model>   **Verifier:** Opus 4.8 high | GPT-5.5 high
- **Worktree / branch:** <branch>
- **Status:** in-progress | green→PR | discarded | merged

## Goal (one sentence)
<deliverable, not topic>

## Files changed
- `path` — <what & why>   (Δ lines: +x / -y  ← aim net-negative)

## Gate results
| Check | Result |
|---|---|
| typecheck | ✅ / ❌ |
| engine:test / clippy | ✅ / ❌ |
| e2e (golden paths) | ✅ / ❌ |
| visual snapshots | ✅ / ❌ |
| maintainability greps | ✅ / ❌ |

## Iterations (why it looped)
1. verifier refutation → fix applied

## Findings raised (→ findings/ + MAINTAINABLE.md + Notion)
- FIND-… : <issue>

## Handoff (what a human reads)
- **Most important change:** <one paragraph>
- **Evidence:** <test output / screenshots>
- **Human UX checklist (only what AI can't judge):**
  - [ ] <screen/file deep-link> — does X feel right?

## Ship
- [ ] PR # opened  - [ ] Greptile passed  - [ ] testing DB ok  - [ ] human merged  - [ ] tag cut
