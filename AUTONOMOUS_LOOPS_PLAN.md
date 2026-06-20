# Autonomous Loops Plan — Maintainable + Feature, with Regression Safety

> **Author goal:** two agentic loops (a nightly *maintainable-code* cron + an on-demand *feature* loop) that change code **without ever breaking what worked yesterday**, are **secure by construction**, and are **fully transparent** (we always know what changed, where, and why).
> **Verifier:** **Opus 4.8 high** standard, fall back to **GPT-5.5 high** when Claude limits hit.
> **Review:** Greptile on every PR. **Human** approves every merge. Git tag = release.

---

## 0. CURRENT STATE — read this first (the honest baseline)

| Layer | Regression protection today |
|---|---|
| Rust (`stage-engine`) | ✅ `cargo test` + `clippy` + `fmt` + `check` (scripts: `engine:test/clippy/fmt/check`) |
| TypeScript (Electron / React / Convex / web) | ❌ **No automated tests at all.** `0` `.test/.spec` files. Only `tsc --noEmit`. |
| CI | ❌ Only `release-desktop.yml`. **No test gate on PRs.** |
| PR review | ✅ Greptile |

**Implication:** right now the only thing standing between a loop and a silent UI/logic regression is typecheck + a reviewer. That is **not enough** for "never break working code." **No loop is allowed to run until Phase 0 (the regression net) exists.**

---

## 1. Non-negotiable rules (apply to BOTH loops)

- [ ] Loop runs in an **isolated sandbox / git worktree**, never the working checkout.
- [ ] Loop **opens PRs only** — it can **never push to `main`** (enforced by branch protection + least-privilege token).
- [ ] A change may merge **only if ALL are true**: full suite green · **no previously-passing test now fails** · Greptile passes · **human approves**.
- [ ] **Verifier ≠ builder.** Verifier is Opus 4.8 high (→ GPT-5.5 high fallback), runs a **refute-only** pass.
- [ ] **Hard caps:** max iterations + token budget per run; on exceed → stop + log, never "force it through."
- [ ] **Scope-lock:** touch nothing outside the approved plan's file list.
- [ ] **Testing DB only.** Production DB promotion is a separate, manual, gated step.
- [ ] **Git tag** is cut by a **human after merge** — never by the loop.

---

## 2. How we actually test (the gate — every loop run, fast → slow)

`pnpm run dev` is for **humans only**. The loop uses this headless gate:

1. **Static** — `pnpm run typecheck` (data-ops + desktop + web) · `engine:fmt` + `engine:clippy` · maintainability greps (`[#hex]`, `: any`, file-size, `window.alert`, `<img>` missing `alt`).
2. **Unit** — `engine:test` (Rust, exists) · **NEW** vitest for TS logic/hooks.
3. **Integration** — **NEW** Convex function tests (`convex-test`) against the **testing** deployment.
4. **E2E** — **NEW** Playwright: Electron via `_electron.launch()` for desktop critical paths + web renderer. Headless, CI/cron-runnable.
5. **Visual** — Playwright screenshots → committed baseline → **diff catches silent UI drift**; attached to the PR for human UX review.

A run is "**verified**" only when 1–5 pass **and** the verifier signs off.

---

## 3. Regression protection — the #1 requirement, spelled out

- **Golden critical-path list** (define together): the flows that must NEVER break — e.g. login/auth, project create, chat/voice run, integrations connect, provider update, export. These get e2e tests first.
- **Green-baseline rule:** the suite must be green **before** a loop starts; the loop records that baseline; **after** its change, **every previously-green test must still be green** or the branch is **discarded** (not "fixed forward").
- **Same gate in CI:** a new PR workflow runs the identical suite, so the rule is enforced **server-side**, not just inside the loop. Branch protection requires it green.
- **Atomic commits, one per checkbox, tagged with the Notion ID** → `git bisect`/`blame` points to the exact change + file when anything regresses.
- **Visual snapshots** catch the breakage typecheck can't see.

---

## 4. The two loops

### 4a. Maintainable-code loop — **nightly cron, background**
- **Trigger:** scheduled (GitHub Actions `schedule:` or a `/schedule` routine). Runs while you sleep; **waits when Claude limits hit** (it's not time-sensitive).
- **Source:** Notion **bugs breakdown** + `apps/user-application/docs/PRE_LAUNCH_CLEANUP.md`.
- **Allow-list of change types (anything else → stop + log):** `[#hex]`→token · split fat file into helpers/hooks · remove `: any` · replace `window.alert` with toast · fix a bug **that comes with a new test proving it** · derive mirrored state.
- **Per item:** fresh worktree → plan → change → **full §2 gate** → verifier (Opus high) → if green, open PR → Greptile → **human merge** → human tag. **Never auto-merge.**

### 4b. Feature loop — **on-demand**
- **Trigger:** you start it from a Notion **task breakdown** item.
- **Plan-approval-first:** AI proposes the execution plan (§7); **you approve before it spends a token.**
- Same skeleton + gate; more iterations allowed; builder = any model; verifier still Opus 4.8 high.

---

## 5. Security model (secure by construction)

- **Isolation:** each run in its own worktree/sandbox; no prod credentials present; **testing DB only**; engine bound to **127.0.0.1**; least-privilege `gh` token (open PR; **cannot** merge or push `main`).
- **Branch protection on `main`:** requires CI green + Greptile + human approval. The loop physically cannot bypass it.
- **Secrets never** appear in logs, journal, or PR body.
- **Architecture gate (also a pen-test checklist):**
  - **Electron:** `contextIsolation:true`, `nodeIntegration:false`, `sandbox:true`, `enableRemoteModule:false` intact · one `contextBridge` method per IPC message (no raw `ipcRenderer`) · every `ipcMain.handle` zod-validates payload + sender.
  - **Convex:** queries pure/read-only · mutations atomic · **actions thin** (only call queries/mutations, never DB direct) · args validated · **authorization server-side** · large reads use index + pagination, no redundant indexes.
  - **Rust sidecar:** loopback-only + auth-token requests (`fetchEngineJsonAuthed`) · every response `...Schema.parse`d at TS boundary · lifecycle via supervisor (no ad-hoc spawn) · lean crates · `cargo test`+`clippy` green.

---

## 6. Transparency / run journal (know what/where/why)

- **`RUN-<id>.md` per run** (also pushed to Notion): approved plan · per-step file changes · every check pass/fail · verifier refutations · final handoff.
- **Handoff** (what a human reads): **the single most important change** (one paragraph) · by-file diff summary · evidence (test output + screenshots + which boxes the verifier ticked) · a **human-only UX checklist** deep-linked to the exact screens/files.
- **Human touchpoints = exactly two:** (1) approve the plan, (2) UX accept + merge. Everything else is automated and logged.

---

## 7. The execution-plan page (Notion, board view) — created BEFORE any spend

```
# GOAL: <one-sentence deliverable>           NOTION-<id>   source: feature | bug
## Scope:  IN: ...    OUT(explicit): ...
## Files to touch: <list>   (scope-lock)
## Acceptance (task-specific): - [ ] ...
## Security + Architecture: <the §5 boxes>
## Maintainable: <the §9 boxes>
## Verifier: Opus 4.8 high (fallback GPT-5.5 high)
## STOP condition: <when to halt and report instead of guessing>
## Est. cost: <iterations × model> 
```
AI fills it in → **you approve** → loop runs.

---

## 8. Phased rollout (loops stay OFF until Phase 0 is done)

- **Phase 0 — Build the net (no autonomy yet):**
  - [ ] Add Playwright (Electron `_electron` + web) + vitest + `convex-test`.
  - [ ] Write **golden critical-path** e2e tests (the §3 list).
  - [ ] Add **PR CI workflow**: typecheck + `cargo test`/`clippy` + e2e + visual + maintainability greps.
  - [ ] Enable **branch protection** on `main` (CI + Greptile + human).
- **Phase 1 — Maintainable cron loop** on the allow-listed mechanical changes only.
- **Phase 2 — Feature loop** (plan-approval-first).

---

## 9. Maintainable checklist (verifier ticks Security + Verify boxes; builder cannot)

**General:** file < ~400 lines · no new `: any` · no new `window.alert/prompt` · `<img>` has `alt` · clickable = `<button>` · tokens not `[#hex]` · no magic constants · derive don't mirror state.
**Electron / Convex / Rust:** see §5 architecture gate.
**Verify gate (Opus 4.8 high / GPT-5.5 high):** re-checked EVERY box and tried to **refute** · signed off OR returned fix-list → iterate.
**Ship:** PR opened → Greptile passes · validated on **testing DB** · human merge · git tag · (later, gated) prod DB.

---

## 10. Cost model

Builder = cheap/Codex (quota-aware); **verifier = one Opus-high pass** (the expensive token spend is the *gate*, not the generation); iteration cap `N`; every run logs estimated requests so spend is visible up front (the §7 "Est. cost" line).

---

### First concrete step
Pilot is **not** a loop — it's **Phase 0 on one flow**: wire Playwright + a single golden e2e test (e.g. "Integrations tab renders + provider update banner"), add the PR CI workflow, enable branch protection. Once that net holds, we turn on the maintainable cron against one `[#hex]→token` item and watch the journal + handoff end-to-end.
