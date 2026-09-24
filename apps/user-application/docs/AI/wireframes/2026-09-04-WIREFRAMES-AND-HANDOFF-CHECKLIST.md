# Wireframes and project handoff checklist — September 4, 2026

This document records the recovery and delivery sequence agreed with Werner on September 4, 2026. It is the checklist for this work; it does not authorize a broad wireframes rewrite.

## 1. Restore and verify wireframes

- [x] Keep the existing Lo-Fi and Hi-Fi generators separate.
- [x] Restore the Lo-Fi/Hi-Fi result switch without changing the Lo-Fi generator.
- [x] Restore **Add or edit screens**.
- [x] Restore adding, editing, selecting, and removing screens.
- [x] Restore deletion of one or more generated wireframes, including a confirmation step.
- [x] Restore **Cancel** while a wireframe run is active.
- [x] Restore Claude/Codex provider selection before generation.
- [x] Return to the initial wireframe choice after all generated screens are deleted.
- [ ] Werner completes the UI smoke test for both Lo-Fi and Hi-Fi.
- [ ] Fix only issues confirmed by that smoke test.
- [ ] Confirm that research/RAG, rendering, generation, and export behavior did not change during the UI recovery.

## 2. Save the recovery cleanly

- [ ] Review the final diff and separate wireframe recovery from unrelated local export work.
- [ ] Commit and push the verified recovery as one understandable change.
- [ ] Merge or close the correct pull requests.
- [ ] Audit old wireframe branches and worktrees before deletion.
- [ ] Delete only branches that are merged, superseded, or explicitly approved for removal.
- [ ] Preserve the current Hi-Fi/RAG implementation for possible future use, even if the product UI later de-emphasizes it.

## 3. Simplify the wireframe code safely

- [ ] Map the remaining Lo-Fi and Hi-Fi responsibilities after the recovery is stable.
- [ ] Remove duplication and dead code in small reviewed changes.
- [ ] Keep screen-level failures isolated; one failed screen must not invalidate successful screens.
- [ ] Keep multi-screen generation bounded to batches of at most five screens.
- [ ] Prefer a usable partial result over failing the complete run.
- [ ] Do not introduce another large rewrite while restoring reliability.

## 4. Export a readable Stage project workspace

- [ ] Export to a local `stage-[project-name]` directory.
- [ ] Export only the project sections selected by the user.
- [ ] Include readable Markdown for project context, research, strategy, moodboard, flows, and selected wireframes.
- [ ] Do not dump raw JSON into user-facing Markdown.
- [ ] Add an `AGENTS.md` file that explains the workspace and gives the coding agent its starting instructions.
- [ ] Place project assets in clear folders such as `assets/research/`.
- [ ] Reference exported assets from the relevant Markdown documents.
- [ ] Report missing asset downloads clearly instead of silently omitting them.
- [ ] Explain in the export UI what the directory contains and how it should be used.

## 5. Open the handoff in Claude Code or Codex

- [ ] Use the official Claude and Codex icons in the export UI.
- [ ] Open the exported directory directly in the selected desktop coding app.
- [ ] Provide the initial task automatically when the supported app interface allows it.
- [ ] Otherwise copy the task and show a persistent, neutral instruction telling the user to paste it.
- [ ] Keep export feedback concise, readable, and visible until dismissed.
- [ ] Do not expose shell commands, inherited `PATH` values, or other implementation details to the user.

## 6. Product work after recovery

- [ ] Add the Details.so integration and include its useful design context or assets in the handoff.
- [ ] Verify the Details.so output inside the exported workspace.
- [ ] Start the planned iOS app work only after the desktop recovery and handoff flow are stable.

## Guardrails

- Keep changes small, understandable, and independently testable.
- Do not modify unrelated project areas while repairing wireframes.
- Do not delete branches, worktrees, data, or generated assets without resolving the exact targets first.
- Let Werner perform the UI test as soon as the focused automated checks pass.
- Do not describe work as complete until the corresponding checkbox has been verified.
