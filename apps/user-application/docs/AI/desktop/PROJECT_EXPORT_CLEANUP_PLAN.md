# Project Export and Wireframes Cleanup

**Status:** Export implementation corrected and focused checks pass locally; Werner's UI smoke test remains.
**Branch:** `codex/sta-33-local-project-export`
**Last updated:** 2026-09-04

## Guardrails

- [x] Keep project export work separate from Lo-Fi and Hi-Fi generation.
- [x] Do not merge the large wireframes reliability snapshot wholesale.
- [x] Do not modify or delete the dirty `stage_mvp` checkout.
- [x] Prefer focused TypeScript checks for this TypeScript-only change; do not rebuild Rust unnecessarily.
- [ ] Run `cargo clippy` only when a later wireframes change touches Rust.

## Project export handoff

- [x] Create a unique `stage-[project-name]` folder.
- [x] Export only the project sections selected by the user.
- [x] Download selected remote assets into grouped `assets/` folders.
- [x] Write `AGENTS.md` as the coding-agent entry point.
- [x] Replace JSON code blocks in exported `.md` files with readable headings, lists, tables, links, and source-code blocks.
- [x] Open Codex directly with the exported folder instead of opening a Terminal command.
- [x] Copy the initial Codex task automatically.
- [x] Show export success as a compact, neutral notification that remains visible until dismissed.
- [x] Use the existing Claude and Codex product icons.
- [x] Use the Refero thumbnail for research references when provided; otherwise use the full image URL.
- [x] Reference downloaded research images from `research.md` with local `assets/research/` paths.
- [x] Keep every Markdown asset link identical to its written local path, including CDN assets without a filename extension.
- [x] Use the same Moodboard image URL for both download and Markdown reference.
- [x] Report failed downloads in the notification and desktop logs without blocking the document export.
- [ ] Smoke-test Export only, Open in Claude Code, and Open in Codex from the desktop UI.
- [ ] Confirm one failed asset does not block document export.

### Export directory contract

The generated `stage-[project-name]` directory is a standalone local project workspace. It is not a copy of the Stage application and Stage does not automatically initialize it as a Git repository. It contains:

- `AGENTS.md` with the handoff and working instructions;
- one readable Markdown document for every selected Stage project section;
- downloaded project files grouped under `assets/`, including research references under `assets/research/`.

The coding agent opens this directory as its workspace and may create the implementation inside it after reviewing the exported context.

### Document and asset rules

- Exported Markdown is written for people as well as coding agents. Internal IDs, transport metadata, and raw `referoContext` are omitted.
- Research summaries, competitors, UI patterns, target users, opportunities, and sources use normal headings, lists, tables, and local image references.
- Strategy uses a dedicated document formatter. Section `status`, block `kind`, internal IDs, and schema labels such as `Body` are not exported; principles, evidence, tables, cards, and callouts are written as normal Markdown.
- Existing export directories are immutable snapshots. Run Export again to see formatter improvements in a new uniquely named directory.
- A missing image does not invalidate otherwise usable project context. Stage completes the document export, names the number of failed files in the persistent notification, and logs each failed relative path with its download error.

### Codex prompt boundary

The installed, supported `codex app [PATH]` command opens a local folder but does not accept a prompt. Stage therefore opens the correct folder and copies this task:

> Read AGENTS.md first. Then review every exported project file and relevant asset. Summarize your understanding and propose an implementation plan before changing any files.

The notification tells the user to paste it into the new Codex task. Stage uses only the public CLI behavior: open the directory with `codex app [PATH]` and copy the task through Electron's clipboard API. It does not use private deep links or UI automation.

## Wireframes recovery — implementation ready, UI verification open

The export flow remains separate from wireframe generation. This branch contains two narrowly scoped UI recoveries; it does not change the Lo-Fi generator, Hi-Fi generator, provider calls, RAG, or persisted artifact schema.

- [x] Restore a visible Cancel action while a generation or regeneration run is active.
- [x] Reuse the existing cancellation boundary; do not add another run or persistence implementation.
- [x] Return to Results or Configure only after cancellation succeeds; a failed cancellation must not hide an active run.
- [x] Restore the Lo-Fi toggle for Hi-Fi artifacts that retain at least one valid Lo-Fi block preview, including when Hi-Fi HTML is missing.
- [x] Reset the selected preview to the newly loaded artifact fidelity when the artifact kind changes.
- [x] Leave Lo-Fi generation, Hi-Fi generation, providers, RAG, and persisted artifacts unchanged.
- [ ] Verify Cancel against a live active generation run.
- [ ] Verify an existing Hi-Fi artifact with retained blocks can switch to Lo-Fi and back.
- [ ] Verify a screen with no retained Lo-Fi blocks still shows an honest placeholder instead of fabricated content.

## Branch and worktree cleanup inventory

### Safe metadata cleanup

These worktree paths no longer exist. `git worktree prune` can remove their stale Git metadata without deleting project files:

- [ ] `/private/tmp/stage-retrieval-concept`
- [ ] `stage_mvp-hotfix-research-client`
- [ ] `stage_mvp-prod-0.2.14`
- [ ] `stage_mvp-research-rollback`
- [ ] `stage_mvp-research-shape-fix`
- [ ] `stage_mvp-wireframes-phase1`

### Local branch deletion candidates after metadata is pruned

These are merged into `origin/work`, or duplicate another local branch. Confirm no open PR still needs the branch name before deleting it:

- [ ] `feat/wireframes-phase1-taste` — merged; remote branch is already gone.
- [ ] `fix/research-competitive-output` — merged.
- [ ] `fix/research-prod-0.2.14-baseline` — merged release baseline.
- [ ] `fix/research-timeout-client-photo` — merged.
- [ ] `fix/research-safe-rollback` — merged.
- [ ] `codex/wireframes-rig-nebius-aug28` — same commit as `codex/wireframes-rag-aug26`; keep the checked-out `wireframes-rag` name.

### Keep for now

- [x] `codex/sta-33-local-project-export` — current export work.
- [x] `codex/wireframes-rag-aug26` — checked out in `stage_mvp` and contains extensive uncommitted work.
- [x] `codex/wireframes-reliability-snapshot-aug30` — source for the three narrow recovery changes above.
- [x] `docs/wireframes-retrieval-concept` — unmerged documentation work.
- [x] `feat/wireframes-real-libraries-regen-parity` — unmerged feature work.
- [x] `fix/research-stability-wireframes-quality` — divergent source branch; review before deletion.
- [x] `landing-page` — unmerged product work.
- [x] `work`, `development`, and `testing` — long-lived branches.

## Verification gate

- [x] `projectExport.test.ts` passes.
- [x] Strategy regression test proves internal status, kind, IDs, and JSON fences are absent.
- [x] User application TypeScript check passes.
- [x] `git diff --check` passes.
- [x] Wireframe diff is limited to the results toggle and generation Cancel UI; no generator, provider, RAG, hook, or schema code was changed for this recovery.
- [ ] Werner confirms the popup, readable export, Codex folder, and copied prompt in the desktop UI.
