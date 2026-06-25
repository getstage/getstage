# MOODBOARD FOLLOWUP PLAN

Last updated: 2026-06-25

Related: [`MOODBOARD_STYLEGUIDE_FIX_PLAN.md`](./MOODBOARD_STYLEGUIDE_FIX_PLAN.md) · [`MOODBOARD_DEV_STATUS.md`](./MOODBOARD_DEV_STATUS.md) · [`R2_PUBLIC_DOMAIN_AUDIT.md`](../infra/R2_PUBLIC_DOMAIN_AUDIT.md)

**Status:** Planned — not started (implementation pending).

Follow-up issues discovered during testing of the Style Guide Fix Plan (2026-06-25).

---

## Checklist

- [ ] Phase A — Provider selection (stop hardcoding Codex)
- [ ] Phase B — Style guide components derive from palette (not all the same)
- [ ] Phase C — Moodboard data loss on tab switch
- [ ] Phase D — Engine image fetch reliability (DNS / retry / logging)
- [ ] Manual test complete

---

## Phase A — Provider selection

**Symptom:** Moodboard import and Style Guide generation always use Codex (`MOODBOARD_IMPORT_PROVIDER = "codex"`, `STYLEGUIDE_PROVIDER = "codex"` in [`useMoodboardTab.ts`](../../../src/hooks/project/moodboard/useMoodboardTab.ts)). Most users will use Claude. Research, Strategy, Flows, and Wireframes already let the user pick via `useProjectAiProvider`.

**Fix:** Replace the hardcoded constants with `useProjectAiProvider(projectId)`, mirroring the Strategy/Flows pattern.

| Change | File |
|--------|------|
| Call `useProjectAiProvider(projectId)` instead of hardcoded constants | [`useMoodboardTab.ts`](../../../src/hooks/project/moodboard/useMoodboardTab.ts) |
| Use `resolvedProviderId` for `importFigmaLink`, `generateWithAi`, and `generateStyleGuide` | [`useMoodboardTab.ts`](../../../src/hooks/project/moodboard/useMoodboardTab.ts) |
| Expose `resolvedProviderId`, `providerOptions`, `selectedProviderId`, `selectProvider` from the hook return | [`useMoodboardTab.ts`](../../../src/hooks/project/moodboard/useMoodboardTab.ts) |
| Add a `ResearchProviderPicker` (or equivalent) in the Moodboard setup UI so the user can switch provider | [`MoodboardTab.tsx`](../../../src/components/project/tabs/moodboard/MoodboardTab.tsx) |
| Show the provider picker before the "Generate Style Guide" button in `DirectionHub` | [`DirectionHub.tsx`](../../../src/components/project/tabs/moodboard/DirectionHub.tsx) |
| Guard: if `resolvedProviderId` is null, show "Select a provider in Settings → Integrations" instead of starting the run | [`useMoodboardTab.ts`](../../../src/hooks/project/moodboard/useMoodboardTab.ts) |

**Pattern to follow:** [`FlowsTab.tsx`](../../../src/components/project/tabs/flows/FlowsTab.tsx) — it uses `aiProvider.resolvedProviderId` and a run-settings dialog with `ResearchProviderPicker`.

**Constraint:** Add the picker, do not remove the existing upload/figma/ai mode toggle. The picker is an additional control.

---

## Phase B — Style guide components derive from palette

**Symptom:** All `ComponentSwatch` instances in [`StyleGuideView.tsx`](../../../src/components/project/tabs/moodboard/StyleGuideView.tsx) render identical hardcoded buttons (`#020617` text-white, `#475569` text-white, `#F1F5F9` text-`#020617`). They ignore the style guide's `colorPalettes` and `typography.fontFamily`. Every style guide looks the same.

**Fix:** Make `ComponentSwatch` / `SampleButton` derive their colors and font from the active style guide.

| Change | File |
|--------|------|
| Pass `styleGuide.colorPalettes` and `styleGuide.typography.fontFamily` into `ComponentSwatch` | [`StyleGuideView.tsx`](../../../src/components/project/tabs/moodboard/StyleGuideView.tsx) |
| `ComponentSwatch` picks 3 distinct colors from the first palette (e.g. lightest, mid/highlight, darkest) for the 3 `SampleButton` variants | [`StyleGuideView.tsx`](../../../src/components/project/tabs/moodboard/StyleGuideView.tsx) |
| `SampleButton` uses `styleGuide.typography.fontFamily` for its font | [`StyleGuideView.tsx`](../../../src/components/project/tabs/moodboard/StyleGuideView.tsx) |
| Atmosphere metric colors already come from the style guide — no change needed there | — |

**Concrete approach:**

```
// Pick 3 swatch tones from the first palette
const palette = styleGuide.colorPalettes[0];
const colors = palette?.colors ?? [];
const swatchTones = [
  colors[colors.length - 1] ?? "#0A0A0A",   // darkest → primary button bg
  colors[Math.min(3, colors.length - 1)] ?? "#525252", // mid → secondary button bg
  colors[0] ?? "#FAFAFA",                    // lightest → tertiary button bg
];
```

Each `ComponentSwatch` renders 3 buttons using those tones (dark bg, mid bg, light bg with dark text). Font family from `styleGuide.typography.fontFamily`.

**Constraint:** Add palette-derived rendering, do not delete the existing `ComponentSwatch` structure. If no palette exists, fall back to the current hardcoded colors.

---

## Phase C — Moodboard data loss on tab switch

**Symptom:** User uploads images, adds them to a direction, switches to Strategy tab, comes back to Moodboard — board is empty. Has to recreate everything.

**Hypothesis:** The `persistBoard` calls are fire-and-forget (`void moodboard.saveBoard(...).catch(() => {})`). If a save fails, the error is swallowed and the data never reaches Convex. When the tab remounts, `useMoodboardArtifact` fetches the latest artifact — which doesn't include the unsaved changes.

**Investigation steps (before fixing):**

1. Add `console.error` inside the `persistBoard` catch block (currently silent) to see if saves are failing.
2. Check Convex dashboard → `projectAi:getLatestMoodboardArtifact` for the test project — does the artifact exist after upload?
3. If the artifact exists but the restore effect doesn't fire, check if `moodboard.data` transitions from `undefined` (loading) → `null` (no artifact) → artifact object. The restore effect `useEffect(() => {...}, [moodboard.data])` only fires on change — if it goes `undefined → null` first, the early return `if (!moodboard.data?.tabData) return` skips, and when the artifact arrives it fires again. This should work, but needs verification.
4. If the artifact does NOT exist after upload, the save is failing. Check the Convex mutation error.

**Potential fixes (after investigation):**

| Fix | File | When |
|-----|------|------|
| Surface `persistBoard` errors instead of swallowing them | [`MoodboardTab.tsx`](../../../src/components/project/tabs/moodboard/MoodboardTab.tsx) | Always |
| Show a toast / error banner when a save fails so the user knows data wasn't persisted | [`MoodboardTab.tsx`](../../../src/components/project/tabs/moodboard/MoodboardTab.tsx) | Always |
| Before tab unmount (`useEffect` cleanup), flush any pending save — or at minimum warn if `isSaving` is true | [`MoodboardTab.tsx`](../../../src/components/project/tabs/moodboard/MoodboardTab.tsx) | If saves are lost on unmount |
| Ensure `persistBoard` uses the latest `mode` from state at call time (not a stale closure) | [`MoodboardTab.tsx`](../../../src/components/project/tabs/moodboard/MoodboardTab.tsx) | If closure staleness is the cause |

**Constraint:** Do not remove the `persistBoard` pattern. Add error surfacing and fix the root cause.

---

## Phase D — Engine image fetch reliability

**Symptom:** Engine logs `could not fetch or validate reference image url=https://assets-testing.getstage.co/...` during a styleguide run. The URL resolves fine from terminal (200, 3.6MB, `cf-cache-status: DYNAMIC`). Both the engine's `reqwest` fetch AND Codex's own `curl` attempt fail with DNS resolution errors inside the engine process.

**Root cause hypotheses:**

1. **Transient DNS failure** — the engine process's DNS resolver had a temporary hiccup.
2. **TLS certificate trust** — `reqwest` with `rustls-tls` uses a bundled certificate store, not the system keychain. If Cloudflare's cert chain isn't in the bundle, the fetch fails.
3. **Network sandbox** — the engine process might have restricted network access in certain environments.

**Fix:**

| Change | File | Why |
|--------|------|-----|
| Log the actual error from `fetch_image_bytes` (currently swallowed into `could not fetch or validate`) | [`styleguide/workflow.rs`](../../../../stage-engine/src/styleguide/workflow.rs) | Diagnose whether it's DNS, TLS, or timeout |
| Add a single retry with 500ms delay on fetch failure | [`styleguide/workflow.rs`](../../../../stage-engine/src/styleguide/workflow.rs) | Handle transient DNS |
| If reqwest TLS is the issue, consider adding `native-tls` feature as a fallback | [`Cargo.toml`](../../../../stage-engine/Cargo.toml) | Only if diagnosis confirms TLS |
| Update the prompt to explicitly tell Codex NOT to fetch URLs via web search | [`styleguide/prompt.rs`](../../../../stage-engine/src/styleguide/prompt.rs) | Prevent Codex from wasting time on `curl` when images are attached |

**Prompt update:**

When `has_attached_images` is true, add: `"Do not attempt to fetch, curl, or web-search the reference URLs. Use only the attached image files."`

**Constraint:** Add retry and logging, do not remove the existing fetch-and-skip-on-failure pattern (graceful degradation is correct).

---

## Implementation order

| Order | Phase | Why |
|-------|-------|-----|
| 1 | Phase C | Data loss is the most destructive — fix first |
| 2 | Phase A | Provider selection unblocks Claude users |
| 3 | Phase D | Image fetch reliability — makes Phase 4 of the prior plan actually work |
| 4 | Phase B | Visual polish — components derive from palette |

---

## Test plan

### Data loss (Phase C)
1. Upload images → add to direction → switch to Strategy → switch back → board intact
2. Upload images → close tab (not just switch) → reopen → board intact
3. Force a save error (disconnect Convex) → error should surface, not swallow silently

### Provider selection (Phase A)
4. Open Moodboard → provider picker visible → switch to Claude → run Refero import → runs with Claude
5. Generate Style Guide → runs with selected provider
6. No provider selected → shows "Select a provider" message

### Image fetch (Phase D)
7. Generate style guide → engine logs actual fetch error if it fails (not just "could not fetch")
8. Transient DNS failure → retry succeeds → images attached
9. Codex does NOT attempt `curl` / `web search` on reference URLs when images are attached

### Components (Phase B)
10. Generate style guide with a warm-toned moodboard → component swatches use warm palette colors
11. Generate style guide with a cool-toned moodboard → component swatches use cool palette colors
12. Style guide with no palette → falls back to current dark/mid/light defaults

---

## Files touched (summary)

| Area | Files |
|------|-------|
| Provider selection | `useMoodboardTab.ts`, `MoodboardTab.tsx`, `DirectionHub.tsx` |
| Components from palette | `StyleGuideView.tsx` |
| Data loss | `MoodboardTab.tsx`, `useMoodboardTab.ts` |
| Engine image fetch | `styleguide/workflow.rs`, `styleguide/prompt.rs`, `Cargo.toml` (if TLS fix needed) |

---

## Out of scope

- Parallel-run banner (deferred from prior plan — YAGNI until multi-project usage is real)
- Full color-palette hex editor in Edit mode (v2)
- IPC upload path (separate desktop perf track)
