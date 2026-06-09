# 30-04-2026 — Client Portal Rebrand Plan

Date: 30 April 2026

## Context

The current client portal (`/portal/$token`) uses a phase-timeline bar + task checklist layout with an orange accent (`#E8734A`). The Figma designs (580:21322 and 580:22906) show a redesigned portal with a **kanban board** layout (5 columns), updated card styles with category pills, and a cleaner header. The designer-side settings page (PortalTab) needs a styling pass to match the new Stage design language.

## What changes

### Part 1: Client Portal Page → Kanban Board
**File:** `app/src/components/portal/ClientPortalPage.tsx`

Replace the current phase-timeline-bar + task-checklist with a kanban board layout:

- **Header**: Keep logo + project name. Add completion % as text + a thin progress bar (not the big circle ring). Add revision counter badge.
- **Kanban columns** (5): `Backlog`, `To-do`, `In-progress`, `Done`, `Revision`
- **Task cards**: White cards with phase-name pill (color-coded), task title, optional description snippet. Styled similarly to existing `KanbanBoard.tsx` cards.
- **No drag-and-drop for clients** — the Figma shows a drag state but clients shouldn't move tasks. Keep it read-only for now.
- **Footer**: Keep "Powered by Stage" footer.

**Column mapping (no schema change needed):**
- Reuse the same logic from `KanbanBoard.tsx` line 40-45:
  - `task.isCompleted` → "Done"
  - `phase.status === "upcoming"` → "Backlog"
  - `phase.status === "active"` → "In-progress"  
  - remaining → "To-do"
- Add "Revision" as an empty 5th column placeholder (future: backed by a task field)

**Reuse from:** `app/src/components/project/KanbanBoard.tsx`
- `PHASE_TAG_COLORS` map
- `getTaskStatus()` function
- Card component structure (adapt styling for portal accent color)

### Part 2: Portal Preview Data
**File:** `app/src/lib/portalPreview.ts`

Update mock data to look good in kanban layout — ensure tasks span multiple phases/statuses so all columns have content.

### Part 3: Designer Settings Styling Pass
**File:** `app/src/components/settings/PortalTab.tsx`

The Figma shows the same settings structure (logo, color, domain) but with updated styling:
- Convert CSS class-based layout (`settings-card`, `card-body`, etc.) to match current Figma card style (white cards, subtle borders, compact spacing)
- Keep the brand color preview card (progress bar + milestone check + "View deliverables" link)
- Keep PRO gating on logo + custom domain
- Match the Figma's "Configure your brand" heading style

### Part 4: Portal Task Page
**File:** `app/src/components/portal/ClientPortalTaskPage.tsx`

Light updates — when a user clicks a kanban card, they should still reach the task detail page. Ensure navigation works from the new card layout.

## Files to modify

| File | Scope |
|---|---|
| `app/src/components/portal/ClientPortalPage.tsx` | **Rewrite** — timeline+checklist → kanban |
| `app/src/lib/portalPreview.ts` | Update mock data for kanban columns |
| `app/src/components/settings/PortalTab.tsx` | Styling pass |
| `app/src/components/portal/ClientPortalTaskPage.tsx` | Minor nav updates |

## Files to reference (not modify)

| File | Why |
|---|---|
| `app/src/components/project/KanbanBoard.tsx` | Reuse column logic, card structure, phase tag colors |
| `app/convex/portal.ts` | Data shape returned by `getByShareToken` |
| `app/src/lib/constants.ts` | `DEFAULT_PORTAL_COLOR` |
| `app/src/hooks/usePortalEdit.ts` | Edit/toggle task hook |

## No schema changes

The Figma's 5 columns map to existing data:
- `isCompleted` + `phase.status` → 4 columns (same as Overview kanban)
- "Revision" column is a placeholder (empty for now)

No database migration needed.

## Implementation order

1. `ClientPortalPage.tsx` — kanban rewrite (biggest change)
2. `portalPreview.ts` — update mock data
3. `PortalTab.tsx` — styling pass
4. `ClientPortalTaskPage.tsx` — minor fixes
5. Type-check + visual verify

## Verification

1. `npx tsc --noEmit` — must pass
2. Open portal preview (`/portal/xxx?preview=1`) — kanban should render with mock data across columns
3. Open settings → Portal tab — brand config should match Figma card style
4. Test accent color change propagates to kanban cards/progress
5. Click a kanban card → should navigate to task detail page
