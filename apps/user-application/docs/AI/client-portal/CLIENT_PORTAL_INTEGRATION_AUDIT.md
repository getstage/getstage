# Client Portal — Integration Audit

**Date:** 2026-06-09  
**Scope:** Desktop designer UI, Convex wiring, share link, preview mode, related stability fixes  
**Notion task:** [client portal](https://app.notion.com/p/37a8714fd557809db4b5d51b2483b333)

---

## Plain-language summary

Wessel built the Client Portal screens in the desktop app (project list, brand settings, preview board, share modal). Most of that was **visual only** — fake tasks and a fake share link.

On **2026-06-09** we wired the important parts to **real Convex data**:

- **Preview Portal** now shows the **actual project** from the URL (name, client, tasks, progress).
- **Share project** now creates/enables a **real client portal link** the designer can copy and send.
- The **client opens that link in the web app** (`/portal/:token`) — that flow already existed; desktop now connects to it.

Brand accent color was already saving to Convex. Logo upload, custom domain, revision submissions, and team invites are still UI-only or web-only.

---

## Status table

| Area | Before | After (2026-06-09) | Where it lives |
|------|--------|-------------------|----------------|
| Client Portal → Projects list | Live Convex projects | Unchanged (already live) | `ClientPortalProjectsView.tsx` |
| Brand Settings → accent color | Live save (Pro gate) | Unchanged (already live) | `ClientPortalSettingsView.tsx` + `settings.updatePortalBranding` |
| Brand Settings → logo / domain | UI only | Still UI only | `ClientPortalSettingsView.tsx` |
| Preview Portal board | Hardcoded `mockProject` (same tasks every time) | **Live project** by `projectId` in route | `ClientPortalPreviewView.tsx` + `useLiveProject` |
| Preview → fake revision column | Injected mock revision tasks | **Removed** — column empty until revision backend exists | `ClientPortalPreviewView.tsx` |
| Preview → open task / crash | Mock ids hit Convex → crash | **No navigation** from preview; invalid task URLs show “not found” | `ClientPortalPreviewView.tsx`, `TaskDetailsView.tsx`, `convex-ids.ts` |
| Share project modal | Hardcoded `https://baseframe.design/` | **Real share URL** + Copy link | `ProjectDetailView.tsx`, `useProjectShareLink.ts`, `portal.ensureShareLink` |
| Project API (desktop) | No portal fields on project detail | **`shareToken`, `shareUrl`, `portalEnabled`** on project detail | `apiReadModel.ts`, `desktop.getProjectData` |
| Client view via link (browser) | Live on web app | Unchanged — desktop now **feeds** this link | Web: `/portal/:token` + `portal.getByShareToken` |
| Team member invites in share modal | Disabled / upgrade UI | Still not wired on desktop (web has this) | `ProjectDetailView.tsx` ShareModal |
| Dev crash screen | Raw module errors shown to user | Generic message only; module errors hidden | `__root.tsx`, `errors.ts`, `electron.vite.config.ts` |

---

## What we changed (by layer)

### Convex / data-ops

| Change | File(s) | Why |
|--------|---------|-----|
| Added `portal.ensureShareLink` mutation | `packages/data-ops/convex/portal.ts` | Creates portal config if missing, enables sharing, returns real URL |
| Extended desktop project detail with portal fields | `apiReadModel.ts`, `desktop.ts`, `project.ts` (schema) | Share modal and project detail can read `shareUrl` / `shareToken` |
| Added `parseConvexTaskId` / `isConvexDocumentId` | `packages/data-ops/src/domain/convex-ids.ts` | Block mock ids like `task-3` from reaching Convex queries |

### Desktop app — Client Portal

| Change | File(s) | Why |
|--------|---------|-----|
| Preview loads live project from route param | `ClientPortalPreviewView.tsx` | `projectId` in URL drives real data, not snapshot |
| Preview header uses real name, client, progress % | `ClientPortalPreviewView.tsx` | Matches what client will see |
| Preview uses portal branding logo/accent from settings | `ClientPortalPreviewView.tsx` | Designer sees branded preview |
| Brand settings “Preview Portal” uses first real project | `ClientPortalSettingsView.tsx` | Was hardcoded `baseframe` |
| Share modal calls `ensureShareLink`, shows Copy | `ProjectDetailView.tsx`, `useProjectShareLink.ts`, `portal.ts` | Designer gets a link to send to client |
| Task detail skips invalid ids | `TaskDetailsView.tsx` | No crash on bad URLs |
| Kanban cards skip invalid task ids for detail query | `KanbanTaskCard.tsx` | Same guard |

### Desktop app — stability (same session)

| Change | File(s) | Why |
|--------|---------|-----|
| Vite resolves `@stage/data-ops` from **source** in dev | `electron.vite.config.ts` | Avoid stale `dist` missing new exports |
| Root error boundary never shows raw `error.message` | `__root.tsx` | Users must not see `/@fs/` module errors |
| Module load errors map to generic copy | `errors.ts` | Same rule app-wide |

---

## How to test

1. Restart desktop dev (`pnpm dev` in `apps/user-application`).
2. **Client Portal → Projects** — list should match your Convex projects.
3. **Preview Portal** on a project — board shows **your** tasks, not “Complete kickoff questionnaire” repeats.
4. Open a **project → Share** — link should look like `https://getstage.co/portal/share_…` (or your `SITE_URL`). Copy and open in browser.
5. Browser portal should show the same project phases/tasks (read-only).

---

## Still open

| Item | Notes |
|------|--------|
| Logo upload on brand settings | UI exists; needs R2 + Convex like web `PortalTab` |
| Custom domain | UI exists; no backend |
| Revision column with real client submissions | Needs schema + mutations; preview drag-to-revision is local-only |
| Team invites in desktop share modal | Match web `ShareProjectDialog` + `collaborators` API |
| Deploy Convex | `portal.ensureShareLink` must be deployed before production desktop build uses it |

---

## For design / PM (Wessel, Vilém)

- **You do not need to change the Figma flows** for this integration pass — we connected existing UI to live data.
- **Preview in desktop** ≈ what the client sees, but marked “Preview Mode” and still inside the designer app.
- **Real client experience** = link from Share → opens **web** portal. Same information architecture; different shell (no Stage sidebar).
- If something still looks like mock data, check you are on a **project with real tasks** and that Convex dev is running.

---

## Related links

- Web client portal: `apps/web-application/src/components/portal/ClientPortalPage.tsx`
- Convex portal API: `packages/data-ops/convex/portal.ts`
- Designer preview route: `/client-portal/$projectId/preview`
