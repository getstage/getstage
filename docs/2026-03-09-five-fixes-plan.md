# 5 Fixes Plan — 9 March 2026

## Fix 1: AI Roadmap — Create actual tasks

`convex/projects.ts:create` makes phases but never inserts tasks.

- **`src/lib/constants.ts`** — Change `AI_ROADMAPS` tasks from `number` → `string[]` with real task titles per phase. Update `RoadmapTemplateItem`.
- **`src/hooks/useProjectCreation.ts`** — Pass task names per phase to mutation.
- **`convex/projects.ts`** — Accept `v.array(v.object({ name, tasks: v.optional(v.array(v.string())) }))`, insert tasks after each phase.
- **`RoadmapStep.tsx`** — Use `.length` instead of raw number for display.

## Fix 2: Guide links → new tab

`GuideLink` (OnboardingModal.tsx:1060) and IntegrationsTab links only do `target="_blank"` for `http` URLs. Internal `/help/...` routes open in same tab.

- **`OnboardingModal.tsx`** line 1060 — Always `target="_blank"` + `rel="noreferrer"`
- **`IntegrationsTab.tsx`** lines 114-115, 205-206 — Same

## Fix 3: Timeline dates -1 day

`formatDateInput()` uses `.toISOString()` (UTC). Correct `formatInputDate()` already exists in same file using local getters.

- **`src/hooks/useProjectDetail.ts`** — Replace `formatDateInput` → `formatInputDate(new Date(timestamp))`, replace `parseDateInput` → `parseInputDate`
- **`src/lib/format.ts`** — Remove dead `formatDateInput`/`parseDateInput`

## Fix 4: Task detail page

Route & component exist. Likely works once Fix 1 creates actual tasks (no tasks = nothing to click). Verify after Fix 1. If still broken, debug route/params.

## Fix 5: Free plan limits (3 projects, no custom logo)

**Note:** Client portal design/preview for clients is not built yet — logo restriction only needs enforcing in Settings upload for now.

### Backend:
- **`convex/projects.ts`** — In `create`, check plan + project count. If free && >= 3, throw error. Import `getCurrentSubscriptionSnapshot` from `./billing`.
- **`convex/settings.ts`** — In `updatePortalBranding`, if free && setting logo (non-null), throw error. (`getCurrentSubscriptionSnapshot` already imported)

### Frontend:
- **`DashboardPage.tsx`** — "New Project" button: if free + projects >= 3, show `UpgradePaywallModal` instead of navigating.
- **`PortalTab.tsx`** — Add `isPro` prop. If not pro, show PRO badge + disable logo upload (same pattern as existing "Custom domain" locked card on line 211).
- **`SettingsPage.tsx`** — Pass `isPro` to PortalTab.

## Verification
1. Create AI project → tasks appear in detail
2. Guide links → open new tab
3. Adjust timeline → correct dates
4. Click task → detail page opens
5. Free user: 4th project blocked, logo upload blocked
6. `pnpm typecheck` passes
