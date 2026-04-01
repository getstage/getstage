# TanStack + Convex Overfetch Summary

This note summarizes the overfetch cleanup we made in Stage so the same approach can be reused in another project.

## Goal

Reduce unnecessary Convex function calls without breaking the parts of the UI that genuinely need live updates.

The key idea was:

- keep live Convex subscriptions only where the UI is collaborative or changes constantly
- move non-critical read models to TanStack Query snapshots
- split heavy backend read models into smaller, purpose-built queries
- invalidate only the specific cached queries that are actually affected by a mutation

## Main Problems We Had

### 1. Heavy global queries were mounted everywhere

We had large overview-style queries being used as a general data source for unrelated UI.

Examples:

- auth/header state used a heavy settings query
- the dock used dashboard data on non-dashboard routes
- task detail subscribed to the full project just to render one task

This created too many live subscriptions and too many repeated Convex calls.

### 2. Broad read models were reused for narrow UI needs

One component often needed only a tiny subset of data, but it subscribed to a large query anyway.

That meant a small mutation could invalidate a much larger query tree than necessary.

### 3. Non-active settings tabs still mounted their queries

Some settings hooks subscribed immediately even when their tab was not open.

### 4. Supporting UI was treated like live data

The dock and settings overview do not need real-time subscriptions in the same way a collaborative project detail page does.

## What We Changed

## 1. Replaced heavy auth/settings dependency with a tiny viewer query

Before:

- auth state depended on a broad settings overview query

After:

- we added a dedicated `viewer.getIdentity` query that only returns:
  - `id`
  - `email`
  - `name`
  - `avatarUrl`
  - `role`
  - `plan`

Files:

- `/Users/wernerjohannesdieben/stage_mvp/app/convex/viewer.ts`
- `/Users/wernerjohannesdieben/stage_mvp/app/src/lib/auth.tsx`

Why this helped:

- auth/header now loads only identity data
- settings data is no longer subscribed globally

## 2. Stopped using dashboard overview for the dock on unrelated pages

Before:

- the dock pulled broad dashboard data on pages like project detail, task detail, and settings

After:

- we created a narrow backend query: `projects.getDockProjects`
- we fetch it through TanStack Query as a cached snapshot via `useDockProjects`

Files:

- `/Users/wernerjohannesdieben/stage_mvp/app/convex/projects.ts`
- `/Users/wernerjohannesdieben/stage_mvp/app/src/hooks/useDockProjects.ts`
- `/Users/wernerjohannesdieben/stage_mvp/app/src/lib/queryKeys.ts`

Why this helped:

- the dock stopped holding a live dashboard subscription open on every route
- the query now returns only the small project card data the dock actually needs

## 3. Replaced full-project task detail subscription with a task-specific read model

Before:

- task detail used `projects.getById`
- editing one task could cause a whole-project read model to refresh

After:

- we added `tasks.getDetail`
- the task page now subscribes only to:
  - task data
  - attachments
  - phase info
  - lightweight project info

Files:

- `/Users/wernerjohannesdieben/stage_mvp/app/convex/tasks.ts`
- `/Users/wernerjohannesdieben/stage_mvp/app/src/components/task/TaskDetailPage.tsx`

Why this helped:

- task editing no longer invalidates a broader project subscription than necessary

## 4. Moved supporting UI reads to TanStack Query snapshots

Before:

- some non-live UI still used live Convex subscriptions

After:

- dock projects use TanStack Query
- settings overview uses TanStack Query
- both use stable query keys plus `staleTime`

Files:

- `/Users/wernerjohannesdieben/stage_mvp/app/src/hooks/useDockProjects.ts`
- `/Users/wernerjohannesdieben/stage_mvp/app/src/hooks/useSettingsOverview.ts`
- `/Users/wernerjohannesdieben/stage_mvp/app/src/lib/queryKeys.ts`

Why this helped:

- snapshot data does not sit there as a live subscription
- Convex calls dropped on routes where the data does not need to be instantly reactive

## 5. Added targeted query invalidation after mutations

After moving parts of the app to TanStack Query, we made sure only the right cached queries refresh.

Examples:

- invalidate dock projects after project creation or project edits
- invalidate settings overview after profile or portal settings changes

Files:

- `/Users/wernerjohannesdieben/stage_mvp/app/src/features/project-detail/useProjectDialogs.ts`
- `/Users/wernerjohannesdieben/stage_mvp/app/src/features/settings/useGeneralSettings.ts`
- `/Users/wernerjohannesdieben/stage_mvp/app/src/features/settings/usePortalBrandingSettings.ts`
- `/Users/wernerjohannesdieben/stage_mvp/app/src/hooks/useProjectCreation.ts`
- `/Users/wernerjohannesdieben/stage_mvp/app/src/features/onboarding/useOnboardingController.ts`

Why this helped:

- no broad “refresh everything” approach
- snapshot queries stay cheap but still remain correct after relevant writes

## 6. Lazy-mounted settings integrations queries

Before:

- integrations-related queries could subscribe even when the tab was not open

After:

- `useIntegrationsSettings` receives `enabled`
- Convex queries are skipped unless the integrations tab is active

Files:

- `/Users/wernerjohannesdieben/stage_mvp/app/src/features/settings/useIntegrationsSettings.ts`
- `/Users/wernerjohannesdieben/stage_mvp/app/src/components/settings/SettingsPage.tsx`

Why this helped:

- tab-specific queries no longer cost anything when the user is not on that tab

## 7. Simplified backend settings work where possible

We also reduced unnecessary data gathering inside backend read models.

Example:

- settings overview no longer does extra project work just to derive a preview portal value

File:

- `/Users/wernerjohannesdieben/stage_mvp/app/convex/settings.ts`

## What We Deliberately Kept Live

We did **not** try to force everything into TanStack snapshots.

These stayed as live Convex reads by design:

- the actual dashboard overview on the dashboard route
- the full project detail page
- the task detail page via its own narrow live query

Reason:

- these screens are core workflow screens
- users expect immediate updates while working

This was important. The fix was not “replace Convex with TanStack”. The fix was “use each tool for the right surface”.

## The Reusable Pattern

Use this decision rule:

### Use a live Convex query when:

- the view is collaborative
- the user is actively editing
- the data changes often
- stale UI would feel broken

Examples:

- project detail
- task detail
- live checklist/status/progress views

### Use TanStack Query when:

- the data is supporting UI
- the view does not need instant real-time updates
- the query is expensive enough that a live subscription is wasteful
- cached snapshot behavior is good enough

Examples:

- dock
- settings overview
- lightweight nav/sidebar data

### Split a backend query when:

- a component only needs a small subset of a bigger read model
- one tiny mutation keeps invalidating a large tree
- the query is reused outside the page it was designed for

## Boilerplate Checklist For Another Project

1. List the top Convex queries by call count.
2. Mark which screens actually need live updates.
3. Find heavy overview queries being reused on unrelated pages.
4. Split those into narrower backend read models.
5. Move non-live supporting data to TanStack Query snapshots.
6. Give those snapshot queries stable query keys.
7. Add targeted invalidation after the exact mutations that affect them.
8. Gate tab-specific hooks with `enabled`.
9. Re-measure in Convex logs after each change.
10. Do not replace live queries on core collaborative screens unless you are sure the UX still works.

## Practical Rules

- Do not use a “dashboard overview” query as a general app data source.
- Do not use a “settings overview” query as a user identity source.
- Do not subscribe to a whole project when one task-specific query would do.
- Do not mount tab queries when the tab is closed.
- Do not invalidate all queries after every mutation.

## Minimal Example Pattern

```ts
// Backend: narrow read model
export const getDockProjects = query({
  args: {},
  handler: async (ctx) => {
    // return only the fields the dock needs
  },
});
```

```ts
// Frontend: snapshot cache instead of live subscription
export function useDockProjects() {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: convexQueryKeys.dockProjects,
    queryFn: () => convex.query(api.projects.getDockProjects, {}),
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 5,
  });
}
```

```ts
// Targeted refresh after a relevant mutation
await updateProject(payload);
void queryClient.invalidateQueries({ queryKey: convexQueryKeys.dockProjects });
```

## Final Takeaway

The most important improvement was not a single optimization. It was a stricter data-access policy:

- tiny query for identity
- narrow query for each supporting surface
- live queries only on truly live screens
- TanStack snapshots for non-live UI
- explicit invalidation instead of accidental reactivity

That combination is what brought the request volume down without making the app feel stale.
