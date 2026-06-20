# Pre-Launch Cleanup Plan — `user-application`

> **Purpose:** capture the code-quality debt found in a read-only audit (2026-06-20) so we can fix it deliberately, not all at once. Nothing here is fixed yet except the reference example in §0.
> **Scope:** `apps/user-application/src`. Audit was static (grep + spot reads); numbers are occurrence counts, not confirmed bugs — each item needs a look before fixing.
> **How to use:** pick items by the **Priority** column. `P0` = do before launch, `P1` = soon after, `P2` = opportunistic. Tackle one caption at a time; don't mix categories in a PR.

---

## 0. Reference pattern (already done) — Provider updates banner

The Claude/Codex "updates available" feature is the template for how these fixes should look:

- Logic lives in a hook: `useProviderUpdates()` in `hooks/engine/useProviderStatus.ts` — `isUpdating` is **derived from the mutation** (`providerUpdate.isPending`), not mirrored into `useState`.
- UI is a thin banner: `components/settings/ProviderUpdatesBanner.tsx` — **design tokens only**, mirrors `DesktopUpdateBanner`.
- The page just renders `<ProviderUpdatesBanner />`.

Use this shape (thin component + backing hook + tokens, no local sentinel state) as the target for everything below.

---

## A. Hardcoded styling instead of design tokens  — **P1**

**What:** Tailwind *arbitrary values* (`bg-[#463FBA]`, `shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]`, `border-[rgba(...)]`) inlined into markup instead of the tokens already defined in `src/styles/globals.css` `@theme`.

**Why it matters:** no theming/dark-mode path, the same purple is copy-pasted as 3+ slightly different hexes, unreadable diffs, and `recipes.ts` already exists for exactly this.

**Evidence:** ~**3,506** arbitrary-value utilities across the app. Worst offenders:

| Count | File |
|---|---|
| 101 | `components/project/tabs/strategy/StrategyTab.tsx` |
| 98 | `components/client-portal/ClientPortalSettingsView.tsx` |
| 96 | `components/client-portal/ClientPortalPreviewView.tsx` |
| 92 | `components/tasks/TaskDetailsView.tsx` |
| 81 | `components/settings/IntegrationsPage.tsx` |
| 78 | `components/project/ProjectDetailView.tsx` |

**Token map (the common ones):**

| Arbitrary | Token |
|---|---|
| `rounded-[12px]` / `[8px]` / `[6px]` | `rounded-panel` / `rounded-surface` / `rounded-control` |
| `bg-[#8782F5]` + hover | `bg-accent` + `hover:bg-accent-hover` |
| `bg-[#EEEDFE]` | `bg-accent-light` |
| `text-[#0A0A0A/#171717/#525252/#737373]` | `text-ink` / `text-ink-soft` / `text-ink-muted` / `text-ink-subtle` |
| `bg-[#F5F5F5]` / `hover:bg-[#EBEBEB]` | `bg-input-bg` / `hover:bg-input-bg-hover` |
| `shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]` | `shadow-stage-hairline` |

**Fix approach:** don't bulk-rewrite 3,506 sites blind. (1) Extend `recipes.ts` with the recurring control/button/card recipes; (2) migrate file-by-file starting with the settings dir (most-touched pre-launch); (3) add a lint rule (`eslint-plugin-tailwindcss` no-arbitrary-value, or a custom grep CI check) to stop the bleed. **P0 sub-task:** the lint guard, so it stops getting worse before launch.

---

## B. Server/store state mirrored into `useState`  — **P0**

**What:** values owned by react-query / Convex / a store get copied into `useState` and re-synced with an effect, so there are two sources of truth that drift.

**Why it matters:** this is the bug class behind "stale UI after refetch." Per the project's own `mut-mutation-state` rule, derive from the query/mutation instead.

**Evidence — confirmed example:** `components/companion/CritiquePanel.tsx`
- `selectedModel/selectedEffort/selectedSpeed` (lines 94–98) mirror `chatDefaults.*` and are re-synced by a `useEffect` (line 229: `setSelectedModel(getChatModelById(chatDefaults.defaults.modelId, availableModels))`). Should be derived, not stored+synced.
- 20 `useState` total in one component — needs decomposition.

**Other candidates** (have `useQuery` + `useEffect` + `useState` together — verify each): `TaskDetailsView.tsx`, `OnboardingIntegrationPanels.tsx`, `IntegrationsPage.tsx`.

**Fix approach:** for each, delete the mirror + sync-effect and compute the value inline from its real owner. `CritiquePanel` is the highest-value target.

---

## C. `X | null` sentinel state  — **P1**

**What:** **59** `useState<… | null>(null)` across the app. Many model "one selected thing, or nothing" and several independent ones in a single component permit illegal combinations.

**Evidence:** e.g. `ProfilePanel.tsx` has 6 separate `string | null` error/notice states (lines 28–33); `IntegrationsPage.tsx` has `busyIntegrationId` + `setupDialogProviderId` (lines 40–41) that can be set simultaneously.

**Fix approach:** where multiple sentinels describe one interaction, collapse into a discriminated union with a named `idle` variant (`{ kind: "idle" } | { kind: "editing"; … }`) + `assertNever` for exhaustiveness. Where a lone sentinel is unavoidable, prefer `undefined` over `null`. Don't fold this into feature PRs — dedicated cleanup.

---

## D. Suspect `useEffect`s  — **P1**

**What:** **187** `useEffect`s; **116** contain a `set*` call. Many are legit (subscriptions), but effect-that-only-setStates is usually derivable-during-render.

**Evidence (effects / setState-count, top):** `CritiquePanel.tsx` (13 / 76), `ProjectHeaderModals.tsx` (6 / 29), `CreateTaskDialog.tsx` (6 / 19), `MoodboardTab.tsx` (5 / 58), `StrategyTab.tsx` (5 / 38).

**Fix approach:** triage per file — keep subscription/imperative effects; replace "derive state in an effect" with `useMemo`/inline; replace "sync prop → state" with derivation or `key=`. Pairs naturally with §B.

---

## E. Duplicated / hardcoded model constants  — **P0 (cheap)**

**What:** the default model id `"gpt-5.5"` and model lists are hardcoded in several places.

**Evidence:**
- `hooks/engine/useChatDefaults.ts:97` `DEFAULT_CHAT_DEFAULTS.modelId = "gpt-5.5"`
- `lib/engine/providerModels.ts:37` `getDefaultModelIdFromProviders` re-hardcodes `"gpt-5.5"`
- `components/companion/CritiquePanel.tsx:100-101` hardcodes favorite ids incl. `"gpt-5.5"`
- `useChatDefaults.ts:37` `chatModels` fallback list — the only place new model names live; verify it stays in sync with the engine.

**Fix approach:** single `DEFAULT_MODEL_ID` const imported everywhere; have `providerModels.ts` and `CritiquePanel` reference it instead of string literals. Small, safe, do before launch.

---

## Suggested order for next week

1. **E** (1–2 h, removes magic strings) and **B/CritiquePanel** (highest correctness value).
2. **A lint guard** (P0) — stop new arbitrary values; migrate settings dir only for now.
3. **C** and **D** as dedicated post-launch passes.

## Conventions to enforce (so this doesn't regress)

- Survey primitives/hooks/tokens **before** writing new UI (`SettingsPrimitives`, `recipes.ts`, `globals.css` `@theme`, `DesktopUpdateBanner` pattern).
- Logic in hooks, thin components; derive from query/mutation (don't mirror).
- Tokens, not arbitrary `[#hex]`.
- See `.agents/skills/tanstack-query-best-practices` (`mut-mutation-state`, `cache-invalidation`) and `tanstack-router-best-practices`.
