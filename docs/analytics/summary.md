# Stage MVP DataFast + R2 Summary

## What changed

This patch adds two things:

1. Product goals in DataFast
- Added client-side DataFast Custom Goals wiring.
- Added a DataFast queue snippet in `index.html` for more reliable capture.
- Stage now sends key product events to DataFast:
  - onboarding started
  - onboarding completed
  - first project created
  - portal shared
  - collaborator invited
  - Google Sheets connected
  - checkout started

2. Ghost-upload protection for R2
- Added a new `uploadedAssets` table.
- Every upload is now tracked before it gets attached to a record.
- When an upload is actually saved to a project/task/profile/sheet connection, the pending tracking row is removed immediately.
- Stale pending uploads are cleaned up automatically on a cron.
- Added a query to inspect possible orphaned R2 objects for the current user.
- `uploadedAssets` is not intended as a permanent analytics/history table; it is only a temporary queue for unfinished uploads.

## Files changed

- `app/convex/schema.ts`
- `app/convex/r2.ts`
- `app/convex/crons.ts`
- `app/convex/onboarding.ts`
- `app/convex/billing.ts`
- `app/convex/collaborators.ts`
- `app/convex/collaboratorInviteHelpers.ts`
- `app/convex/googleSheets.ts`
- `app/convex/projects.ts`
- `app/convex/settings.ts`
- `app/convex/tasks.ts`
- `app/src/features/onboarding/useOnboardingController.ts`
- `app/src/features/project-detail/useShareLink.ts`
- `app/src/components/project/dialogs/ShareProjectDialog.tsx`
- `app/src/features/settings/useBillingSettings.ts`
- `app/src/features/settings/useIntegrationsSettings.ts`
- `app/src/components/shared/Navbar.tsx`
- `app/src/components/dashboard/DashboardPage.tsx`
- `app/src/lib/datafast.ts`
- `app/index.html`

## Important note

This prevents future orphan uploads and makes them auditable.

It does **not** automatically delete every old legacy orphan object in R2 globally. It does add detection for likely orphaned user-scoped objects and automatic cleanup for new stale pending uploads going forward.

There is no longer a Convex `goalEvents` event log in this patch. Product analytics goals are sent to DataFast, while Convex only keeps normal product state plus the temporary pending-upload rows needed for cleanup.

## Verification

- `pnpm exec convex codegen`
- `pnpm run typecheck`
- `pnpm run build:testing`

All passed locally.
