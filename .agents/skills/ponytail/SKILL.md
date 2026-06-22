---
name: ponytail
description: >-
  Minimalism enforcer for code changes in Stage. Apply the decision ladder
  (YAGNI → stdlib → existing dep → one line → minimal code) and the delete-list
  review before any PR. Load when adding code, when a diff feels like it is only
  growing, when MAINTAINABLE.md or a PR asks for /ponytail-review, or when the
  user says a change is "adding too much code". Minimalism only — never trims
  correctness, security, data-loss, or accessibility.
---

# Ponytail (Stage minimalism)

Ponytail is the counterweight to "add code to fix it". It keeps diffs **net-negative or flat**. Run every change through the ladder, then the delete-list, before opening a PR.

Source: https://github.com/DietrichGebert/ponytail · enforced by `loop/MAINTAINABLE.md`.

## Prime directive

**Change / refactor / delete — do NOT add code or grow files.** If a fix genuinely needs new code, it should be *extracting* a helper out of an existing file, not bolting one on. A good PR usually ends with a **net-negative or flat line count**.

## The decision ladder (top rung wins)

Walk it top-down. Stop at the first rung that solves the problem — don't reach for a lower one.

1. **YAGNI** — don't build it. Is the requirement real *right now*, or speculative?
2. **stdlib** — does the language / standard library already do this?
3. **existing dep or helper** — is there a function, hook, or token already in the repo? **Grep first.**
4. **one line** — can it be one line inside an existing function?
5. **minimal new code** — only now write new code, and the least that works.

## Delete-list review (`/ponytail-review`)

Run it on the diff. It returns a **delete-list** of additions that earn nothing. **The delete-list must be applied before the PR.** Common entries:

- speculative params, flags, or abstractions ("might need this later")
- a helper extracted for a single caller → inline it
- a bundle/struct field added only to pass data to a redundant call → delete both
- concurrency, caching, or config that nobody asked for (YAGNI)
- tests that only exercise the helper you just added to satisfy a rule
- comments that restate the code
- re-derived state that could be computed once

## What Ponytail does NOT touch (never trim)

Ponytail is minimalism **only**. It does **not** verify correctness, so it never replaces the test / verify gate. And it never trims:

- **Security** — authz, input validation (zod/contracts), secret handling, IPC/engine surface
- **Data-loss** safety
- **Accessibility** — `alt` text, focusable/clickable controls

## Heuristics

| Smell | Move |
|-------|------|
| File > ~400 lines | Split into hooks/subcomponents — don't append |
| New function | Grep for an existing one first |
| New field/param | Can the caller derive it instead? |
| New concurrency/cache | Asked for, or YAGNI? Default to the simple sequential path |
| "Just in case" abstraction | Delete until a second caller exists |
| Rewrite of a working loop | Edit it in place instead |

## Checklist before opening a PR

1. Did I change/delete more than I added? (aim net-negative)
2. Did I stop at the highest ladder rung that worked?
3. Did I grep for an existing helper/token before writing new code?
4. Ran `/ponytail-review`; applied the delete-list.
5. Security / data-loss / a11y left intact by the trimming.
