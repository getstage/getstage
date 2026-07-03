## Context

Hi-Fi wireframe **Regenerate** in the Wireframes tab is misleading and often appears to do nothing. Selecting 2 screens and clicking **Regenerate 2 screens** only updates those 2 (by design), but all cards show the same fresh timestamp (e.g. `1m ago`), success copy implies a full rebuild, and the selected screens look visually identical because the provider copies the previous HTML from the prompt. Export failures (`Stage could not reach the local engine`, `UnknownVizError`) and broken previews (raw CSS/text instead of rendered UI) are separate reliability gaps.

**End state:** Partial regen updates only selected screens, shows accurate per-screen timestamps and a count-based success message, fails or retries when the model returns unchanged or invalid HTML, and export/preview errors surface actionable messages.

## Approach

### 1. Fix card timestamps so partial regen is honest

**Problem (confirmed):** `buildResultCards()` in `mapWireframesArtifactToTabData.ts` passes artifact-level `generatedAt` into every card. `WireframeCard` prefers `card.generatedAt` over per-screen `generatedAtLabel`, so after any regen **all** cards display the same relative time even when only 2 screens changed.

**Edit `packages/data-ops/src/contracts/wireframes.ts`:** Add optional `generatedAt: z.number().int().nonnegative().optional()` to `wireframeGeneratedScreenSchema` (alongside existing `generatedAtLabel`).

**Edit `apps/stage-engine/src/wireframes/normalize.rs` — `normalize_screen()`:** Accept a `generated_at_ms: u128` parameter. When normalizing a screen (full or partial run), set both `generatedAtLabel` (keep `"just now"` for newly normalized screens) and `generatedAt` (numeric ms from `now_millis()`). Update `normalize_wireframes_artifact()` call sites to pass `generated_at`.

**Edit `apps/stage-engine/src/wireframes/normalize.rs` — `merge_regenerated_screens()`:** When replacing a screen from `partial_screens`, copy the partial screen's `generatedAt` / `generatedAtLabel`. For screens **not** in `screen_ids`, preserve existing `generatedAt` / `generatedAtLabel` unchanged (do not inherit artifact-level timestamp). Still update artifact-level `generatedAt` / `generatedAtLabel` from the partial artifact for artifact metadata only.

**Edit `apps/user-application/src/lib/project/mapWireframesArtifactToTabData.ts`:** In `mapWireframesArtifactToTabData()`, map `generatedAt` from each `generatedScreens[]` entry. In `buildResultCards()`, pass per-screen `generatedAt: generated?.generatedAt` instead of artifact-level `generatedAt` for every card. Fallback: if a screen has no `generatedAt`, use artifact `generatedAt`; if neither exists, use `generatedAtLabel` string only.

**Edit `apps/user-application/src/components/project/tabs/wireframes/ResultsGrid.tsx` — `WireframeCard`:** Keep current display logic (`card.generatedAt ? formatRelativeTime(card.generatedAt) : card.date`); with step 1, only regenerated cards get a new numeric timestamp.

**Tests:** Extend `apps/stage-engine/src/testing/wireframes/normalize.rs` merge test to assert untouched screen keeps old `generatedAt`, replaced screen gets new `generatedAt`.

### 2. Stop the model from copy-pasting previous Hi-Fi HTML on regen

**Problem (confirmed from run `796ce3b9…`):** `build_wireframes_prompt()` always injects the full `existingWireframesArtifactJson` including prior `html` fields. Partial regen adds "PARTIAL REGENERATION: Return generatedScreens[] containing ONLY these screen ids" but still supplies complete old HTML, so Codex returns near-identical markup (log diff shows minor additions only).

**Edit `apps/stage-engine/src/wireframes/prompt.rs`:** When `regenerate_screen_ids` is `Some(ids)`:
- Build a **redacted** previous artifact for the prompt: for each `generatedScreens[]` entry whose `id` is in the regen set, omit the `html` field (keep `id`, `title`, `goal`, `sections`, `priority`). For non-regen screens, omit the entire entry from the prompt block (they are not being regenerated).
- Replace the partial-regen rule line with explicit copy:

```
- PARTIAL REGENERATION: Return generatedScreens[] containing ONLY these screen ids: {ids}. Re-design each returned screen from strategy/moodboard context. Do NOT reuse prior html markup or layout structure for these ids. Each returned screen MUST have a non-empty "html" that is materially different from the saved artifact (different section order, layout pattern, or visual rhythm).
```

**Edit `apps/stage-engine/src/testing/wireframes/prompt.rs`:** Add test asserting regen prompt does **not** contain a known `html` substring from `existingWireframesArtifactJson` for a requested screen id, and does contain the "Do NOT reuse prior html" line.

**Do not** remove `existingWireframesArtifactJson` from engine input entirely — merge still needs full JSON server-side via `WireframesInput.existing_wireframes_artifact_json`; only the **prompt payload** is redacted.

### 3. Fail partial regen when output is empty, incomplete, or unchanged

**Problem (confirmed):** `merge_regenerated_screens()` silently keeps old HTML when the model omits a requested id (`unwrap_or(screen)`). No check that returned HTML differs from pre-merge HTML. Provider can "succeed" while changing nothing.

**Edit `apps/stage-engine/src/wireframes/normalize.rs` — new helper:**

```rust
fn html_changed(before: &str, after: &str) -> bool {
    before.trim() != after.trim()
}
```

**Edit `merge_regenerated_screens()`:** After building `merged_screens`, for each `screen_id` in `screen_ids`:
- Resolve the **pre-merge** screen html from `existing_screens` (empty string if missing).
- Resolve the **post-merge** screen html from `merged_screens`.
- If post-merge html is empty → `bail!("Regenerated screen {screen_id} has empty html.")`.
- If post-merge html equals pre-merge (via `html_changed`) → `bail!("Regenerated screen {screen_id} is unchanged. Retry regeneration.")`.
- If `screen_id` was requested but no partial screen was returned **and** html is unchanged → same error (don't silently succeed).

**Edit `apps/stage-engine/src/wireframes/workflow.rs`:** Map these `InvalidRequest` errors to user-visible run failure (existing path). Update success event copy for regen runs:

```rust
final_text: Some(format!("Updated {} wireframe screen(s).", regenerate_screen_ids.as_ref().map(|v| v.len()).unwrap_or(normalized_screen_count)))
```

Use `regenerate_screen_ids.len()` when `Some`, else existing generic `"Wireframes generated."`.

**Tests:** Add normalize tests: (a) unchanged html → error, (b) changed html → ok, (c) omitted requested id with unchanged html → error.

### 4. Make regen UX explicit about scope and outcome

**Edit `apps/user-application/src/components/project/tabs/wireframes/GeneratingStep.tsx`:** Accept optional `screenCount?: number`. When `mode === "regenerate"` and `screenCount` is set, subtitle becomes: `Rebuilding {screenCount} selected screen(s) with your current brand context. Other screens stay as-is.`

**Edit `apps/user-application/src/components/project/tabs/wireframes/WireframesTab.tsx`:** Pass `screenCount={regeneratingScreenIds?.length ?? selectedRegenerateIds.size}` into `GeneratingStep` while `step === "generating"`.

**Edit `ResultsGrid.tsx` — `WireframeCard`:** When `isRegenerating`, label stays `Regenerating…`. After run, only cards whose `generatedAt` updated should show fresh relative time (step 1).

**Edit `useWireframesRun.ts` — terminal failure handler:** If `terminalEvent.error` message contains `"unchanged"` or `"empty html"`, set that message directly instead of generic `WIREFRAMES_RUN_FAILED_USER_MESSAGE`.

### 5. Validate Hi-Fi HTML before save (fixes raw CSS/text previews)

**Problem (Foxglove screenshot):** `normalize_screen()` accepts any non-empty `html` string. Malformed output (raw CSS text, missing `<style>`, no root wrapper) renders as unstyled text in `buildWireframePreviewDocument()` (`shared/wireframePreviewDocument.ts` wraps fragment in `<body>`).

**Edit `apps/stage-engine/src/wireframes/normalize.rs` — new fn:**

```rust
fn validate_hifi_html(html: &str) -> anyhow::Result<()> {
    let trimmed = html.trim();
    if !trimmed.contains("<style") && !trimmed.contains("style=") {
        bail!("Hi-Fi html must include a <style> block or inline styles.");
    }
    if !trimmed.contains("<div") && !trimmed.contains("<header") && !trimmed.contains("<main") && !trimmed.contains("<section") {
        bail!("Hi-Fi html must include semantic layout elements (div/header/main/section).");
    }
    Ok(())
}
```

Call from `normalize_screen()` when `html` is present **and** caller indicates Hi-Fi kind (thread `WireframeKind` into `normalize_screen` / `normalize_wireframes_artifact`).

**Edit `apps/stage-engine/src/wireframes/workflow.rs`:** On validation failure, fail the run with the validation message (user can retry regen). Do **not** auto-retry provider in v1.

**Edit `apps/user-application/src/components/project/tabs/wireframes/WireframeHtmlPreview.tsx`:** Add `key={html.length + html.slice(0, 64)}` on thumbnail and dialog iframes so html swaps force remount (guards against stale iframe paint when `inView` stays true).

### 6. Harden export error surfacing (engine + Paper)

**Problem (confirmed):** `toUserFacingErrorMessage()` maps engine network failures to `Stage could not reach the local engine. Restart Stage and try again.` (`errors.ts:137`). `UnknownVizError` comes from Paper MCP `write_html` and is shown raw (`useWireframeDeliveryExport.ts` only strips IPC prefixes).

**Edit `apps/user-application/src/lib/errors.ts`:** Add pattern `/UnknownVizError/i` → return `"Paper could not render this design. Try regenerating the screen, then export again."`

**Edit `apps/user-application/src/hooks/project/assets/useWireframeDeliveryExport.ts` — `formatDeliveryExportError()`:** Also map `/Paper .* failed/i` and `/Open Paper Desktop/i` to the same friendly Paper message when not already matched.

**Edit `apps/user-application/src/components/project/tabs/assets/ExportOptionsDialog.tsx`:** Before calling export handlers, invoke existing engine health / `engineGetPaperStatus`. If engine not reachable, set error to `Stage could not reach the local engine. Restart Stage and try again.` without starting export. If Paper status `ready === false`, show Paper connection message from status payload.

**No change** to Paper MCP integration beyond message mapping — `UnknownVizError` is external; root fix for Paper is step 5 (valid html) plus step 2 (regen produces renderable markup).

### 7. Verification order (build after each logical group)

Run steps 1→3 (engine) together, then 4 (UI), then 5→6.

## Critical files & anchors

| Path | Anchor | Why |
|------|--------|-----|
| `apps/stage-engine/src/wireframes/normalize.rs` | `merge_regenerated_screens`, `normalize_screen` | Merge logic, per-screen timestamps, html validation, unchanged detection |
| `apps/stage-engine/src/wireframes/prompt.rs` | `build_wireframes_prompt` | Redact prior html on regen; anti-copy instructions |
| `apps/stage-engine/src/wireframes/workflow.rs` | `WireframesWorkflow::run` | Regen merge call, success/failure messaging |
| `apps/user-application/src/lib/project/mapWireframesArtifactToTabData.ts` | `buildResultCards` | Per-screen timestamp display bug |
| `apps/user-application/src/components/project/tabs/wireframes/ResultsGrid.tsx` | `WireframeCard` | Timestamp + regen labels |
| `apps/user-application/shared/wireframePreviewDocument.ts` | `buildWireframePreviewDocument` | Preview wrapper (reference for validation rules) |
| `packages/data-ops/src/contracts/wireframes.ts` | `wireframeGeneratedScreenSchema` | Optional per-screen `generatedAt` field |

## Verification

**Engine unit tests** (from repo root):

```bash
cd apps/stage-engine && cargo test wireframes::normalize -- --nocapture
cd apps/stage-engine && cargo test wireframes::prompt -- --nocapture
```

Expected: new tests for merge timestamps, unchanged-html rejection, redacted regen prompt pass.

**Manual UI — partial regen (project `Test project has wireframes`):**

1. Open Wireframes → Hi-Fi results with 6 cards.
2. Click **Regenerate**, select **only** Marketing Landing Page + Buyer Account Signup, confirm **Regenerate 2 screens**.
3. After completion:
   - Those 2 cards show a new relative time; the other 4 keep their previous time.
   - Full preview for a regenerated card shows visibly different layout (not just copy tweaks).
   - Regenerating with unchanged provider output (simulate by temporarily forcing `html_changed` to false in dev) shows failure toast mentioning `unchanged`, not silent success.

**Manual UI — broken html guard:**

1. If a screen preview shows raw CSS text, regen that screen; run should fail with html validation message OR succeed with rendered layout in iframe preview.

**Export:**

1. With engine running: export one regenerated Hi-Fi screen to Paper → succeeds or shows Paper connection message, not raw `UnknownVizError`.
2. Stop stage-engine sidecar, attempt export → immediate friendly engine unreachable message (no hung spinner).

**Typecheck:**

```bash
pnpm --filter @stage/data-ops typecheck
pnpm --filter user-application typecheck
```

## Assumptions & contingencies

- **Assumption:** Partial regen remains opt-in per selected cards; we do **not** auto-select all screens on **Regenerate** click. If product wants "regenerate all" as default, add a separate step 4 toggle `selectAllOnEnterRegenerateMode` — only implement if requested after this fix.
- **Assumption:** String equality on trimmed `html` is sufficient for "unchanged" detection in v1. If false positives occur (whitespace-only regen), normalize whitespace before compare in `html_changed`.
- **Contingency:** If redacted prompt causes provider to omit required screens, step 3 failure messages surface it; loosen validation only for Lo-Fi (skip `validate_hifi_html` when `WireframeKind::Lofi`).
- **Contingency:** If `generatedAt` on old artifacts is missing after deploy, `buildResultCards` falls back to artifact-level timestamp — acceptable for legacy artifacts until next full generate.
