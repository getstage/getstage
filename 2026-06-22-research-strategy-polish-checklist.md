# Research + Strategy Polish — Execution Checklist

Branch: `fix/research-strategy-polish` (off `origin/work`). PR → `work`. **Do not merge.**
Maps to the four screenshots: #12 (Strategy buttons do nothing), #23 (modal blur),
#24 (URL not-existing + typo warning), #26 (Target Users readability + avatar).
Plus full-res images and docs.

Legend: `[ ]` todo · `[x]` done. Keep diffs net-flat (ponytail): reuse before adding.

---

## Section 1 — Strategy "Approve & Save" / "Regenerate with AI" feedback (screenshot #12)
Files: `StrategySectionCard.tsx`, `EditableStrategySection.tsx`, `StrategyTab.tsx`,
`useStrategySectionRegenerate.ts` (reuse `useStrategyRun.ts` lifecycle).

- [x] Read all four files + `useStrategyRun.ts` to confirm current props/state.
- [x] `useStrategySectionRegenerate`: expose run lifecycle by reusing the same run-watch as `useStrategyRun` (extracted shared `hasTerminalRunEvent`/`latestTerminalRunEvent` → `lib/engine/runTerminalEvents.ts`) — surfaces `isRegenerating`, `error`, `activeSectionId`.
- [x] Keep "regenerating" true until a terminal event (`run_completed | run_failed | run_cancelled`).
- [x] Add per-section duplicate-run guard keyed `${projectId}:${sectionId}` (`lockRef` + `activeSectionId` guard → second click no-ops).
- [x] `StrategySectionCard` props: add `isApproving`, `isRegenerating`, `actionError`.
- [x] Approve button: show `Saving…` + `disabled` while approving.
- [x] Regenerate button: show `Regenerating…` + `disabled` while that section runs.
- [x] Render inline `actionError` under the section when approve/regenerate fails.
- [x] `StrategyTab`: section-scoped `approvingSectionId`/`sectionActionError` + hook's `activeSectionId` wired into the card; run failures surface in the banner.
- [ ] VERIFY (manual, app run): approve shows Saving…; failed save shows inline error; regenerate stays loading to terminal event; double-click no-ops.

## Section 2 — Full-res Research images (one-line fix; Rust already correct)
Files: `mapResearchArtifactToTabData.ts` (+ verify `PhotoLightbox.tsx`).

- [x] Confirmed `refero_assets.rs` already sets `image_url`+`thumbnail_url` to full R2 key — Rust untouched.
- [x] `mapResearchArtifactToTabData.ts`: grid `src` = `thumbnailUrl ?? imageUrl` (thumbnail in grid); `fullSrc` = `imageUrl ?? thumbnailUrl` (full on click). Per user: thumbnail in grid, full only on click — net no change vs origin.
- [x] `PhotoLightbox.tsx`: no upscaling at zoom=1 (already true) — left as-is.
- [ ] VERIFY (manual): new research run → carousel, lightbox, and "Open original" all show the sharp full image.

## Section 3 — Re-run research modal blur (screenshot #23)
File: `ResearchRerunDialog.tsx`.

- [x] Overlay: `bg-black/10 backdrop-blur-[5px]` applied.
- [ ] VERIFY (manual): modal opens, background is blurred, scroll/cancel/submit still work.

## Section 4 — URL reachability warning + typo suggestion (screenshot #24)
IPC files: `shared/ipc/channels.ts`, `electron/ipc.ts`, `electron/preload.ts`, `src/types/stage-desktop.d.ts`.
Renderer: new `src/lib/project/checkWebsiteReachability.ts`, `ResearchConfigureStep.tsx`
(reuse `researchConfigureInput.ts` for hostname normalization).

- [x] Add channel `researchCheckUrlReachability` + shared `UrlReachabilityResult` type in `shared/ipc/channels.ts`.
- [x] Handler extracted to `electron/helpers/url-reachability.ts` (keeps `ipc.ts` a one-liner). Validate URL in main; `AbortController` 5s timeout; HEAD. **Refinement (toyota): any HTTP response = domain exists = reachable; only DNS/timeout/connection failures warn** — avoids false warnings on sites that block HEAD. Reasons: `dns | timeout | unknown` ("http" dropped — unused).
- [x] `preload.ts`: expose `research.checkUrlReachability(url)` (no generic ipcRenderer).
- [x] `stage-desktop.d.ts`: typed the method + return union (imports shared type).
- [x] `checkWebsiteReachability.ts`: calls IPC; web/no-desktop and checker failure → `{ ok: true }` (never blocks).
- [x] Inline Levenshtein (no dependency).
- [x] Typo suggestion: normalize host (lowercase, strip protocol/www/trailing); compare vs entered client+competitor hosts + small common-domain set; suggest only if distance ≤ 2 and same TLD.
- [x] Warning state pulled into `useUrlReachabilityWarnings` hook (keeps `ResearchConfigureStep` tight); check website on blur, competitor after adding; keyed by normalized URL.
- [x] Render warning under website field, under each competitor chip, + top summary.
- [x] Copy: "This domain does not appear to exist. Did you mean <x>?" / "Could not reach this site. Check for typos before running research."
- [x] Submit stays warn-only (never blocks).
- [ ] VERIFY (manual): fake URL warns + submit works; typo (imigineart.ai→imagineart.ai) suggests; valid URL no warning.

## Section 5 — Target Users readability + avatar (screenshot #26)
Files: `researchTab.ts` (type), `mapResearchArtifactToTabData.ts`, `applyResearchTabEdits.ts`,
`TargetUsers.tsx` (reuse `ui/Avatar.tsx`, `getInitials`, color-by-index palette).

- [x] `ResearchTargetUser`: `goals: string[]`, `frustrations: string[]` (renamed from `frustration`; single strings dropped).
- [x] `mapResearchArtifactToTabData.ts`: `joinSentences` deleted (dead) — arrays passed through.
- [x] `applyResearchTabEdits.ts`: save arrays back (trim+filter; `parseListText` deleted as dead). Validated by `researchArtifactSchema.parse` at save (every item non-empty → satisfies `z.string().min(1)`).
- [x] `TargetUsers.tsx`: hardcoded avatar replaced with `<Avatar name={user.name} … />` (initials); added optional `style` prop to `Avatar`.
- [x] Deterministic avatar color by card index (local `TARGET_USER_COLORS`).
- [x] Left-align avatar + name/role.
- [x] One bullet per goal + per frustration; edit = multiline textarea; `leading-[1.5]`.
- [x] Stable key `${user.name}-${index}`.
- [ ] VERIFY (manual): cards readable, separate bullets, distinct avatars; edit/save round-trips.

## Section 6 — Docs
- [x] `docs/AI/research/RESEARCH_TESTING.md`: dated polish section (full-res images, modal blur, URL warnings, typo suggestions, Target Users bullets).
- [x] `docs/AI/strategy/STRATEGY_TESTING.md`: dated polish section (approve saving, inline error, regenerate-until-terminal, failed regenerate, double-click).
- [x] `.agents/skills/refero-mcp/references/stage-engine-integration.md`: thumbnailUrl syncs to full R2 key; carousel now `imageUrl`-first; Target Users arrays (no joinSentences).

## Final
- [ ] `pnpm --dir apps/user-application typecheck` → passes.
- [ ] `cargo test --manifest-path apps/stage-engine/Cargo.toml` only if Rust touched (expected: not touched).
- [ ] Self-review diff (ponytail: net-flat, no dead code, a11y intact).
- [ ] Commit on `fix/research-strategy-polish`.
- [ ] Push branch to origin. **Do NOT merge into `work`** — open PR only when asked.
