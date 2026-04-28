# 28-04 Projects Figma Implementation Plan

Date: 28 April 2026  
Status: Planning only. Do not implement from this document until approved.

## Purpose

This plan sorts the latest Projects Figma screens into a clear implementation order. The goal is to avoid another broad, uncontrolled pass: each screen state gets mapped to a product area, expected UI behavior, likely files, and verification notes.

Primary source of truth:

- Figma file: `1r1quTKtqFy9E2UZt3rnOd`
- Latest node set from 28-04: `430:*`, `438:*`, `452:*`, `467:*`, `475:*`
- Icon assets: `app/public/logos/projects`

Earlier `284:*` and `390:*` references are useful background, but the latest `430/438/452/467/475` set should win where the designs differ.

## Non-Negotiables

- Do not change the database schema unless explicitly approved.
- Project type must stay in the frontend project creation/onboarding flow.
- Project type UI must only show these three options: `web-design`, `app-design`, `web-app`.
- Existing/legacy database project types must remain accepted.
- Sidebar icons must not turn white on active/clicked state unless the Figma design explicitly shows a white icon on a dark active pill.
- Use the provided icons from `app/public/logos/projects` where possible.
- Match Figma layout first, then wire existing data/actions into it.

## Global Layout Rules

The project pages share the same frame:

- Left collapsed sidebar with Stage logo, search, navigation icons, help/profile at bottom.
- Main white app canvas with back link, project title, subtitle, tab bar, share controls.
- Project tab order from latest Figma set:
  `Overview`, `Research`, `Strategy`, `Moodboard`, `Flows`, `Generate`, `Assets`.
- The tab starts as `Generate` before wireframes exist, then changes to `Wireframes` once generated wireframes exist.
- Main content panels use soft gray outer sections with white inner cards, subtle borders, small radii, and compact spacing.
- Purple active tab/button treatment should match Figma, not the current oversized or generic styling.

## Icon Asset Mapping

Use assets from `app/public/logos/projects`:

- Sidebar: `Search`, `Home`, `Projects`, `Tasks`, `Integrations`, `Settings`, `Client`, `Help`
- Project tabs: `Projects` or grid for Overview, `Search` for Research, `Strategy`, `Moodboard`, `Flows`, `Generate` or `Wireframe`, `Asset`
- Actions: `Share`, `Menu`, `Add`, `Upload`, `Trash`, `Save`, `Edit`, `Regenerate`, `Right`, `Check`, `Warning`
- File/document states: `Documents`, `PDF`, `Screen`, `Placeholder`, `Lo-Fi`

Implementation note: remove any global `brightness-0 invert` behavior that forces black SVGs to white in active states.

## Implementation Order

1. Project shell foundations
2. Sidebar and icon state fix
3. Project header and tab bar
4. Overview/Kanban
5. Research
6. Strategy
7. Moodboard
8. Flows
9. Generate/Wireframes
10. Assets
11. Share modals
12. Project creation/onboarding project-type correction
13. Verification pass

This order keeps shared layout work first, then builds each tab in the order users move through the product.

## Screen Inventory

| Area | Node | State | Key Requirements |
| --- | --- | --- | --- |
| Overview | `430:6600` | Default board | Kanban columns Backlog, To-do, In-progress, Done; compact cards; Recent Activity below. |
| Overview | `430:19062` | Hover/drag state | Dragged task visual, hover state, board still aligned to same shell. |
| Research | `430:6990` | Configure empty | Client website, brief/context upload, competitors input/add, reference links, additional notes, Cancel, Run Research. |
| Research | `430:11960` | Configure filled | Competitor row with trash action; same form layout. |
| Research | `430:13545` | Latest research | Complete status, rich research report card, Edit Research, Send to Notion, Continue to Strategy. |
| Strategy | `430:11028` | Generating | Center loading panel, icon/spinner, checklist progress. |
| Strategy | `430:12189` | Mixed approval | Progress header, approved sections, action-required sections, Approve & Save, Regenerate with AI. |
| Strategy | `430:12784` | All approved | Clean approved section list, Add Section, Add to Notion, Continue to moodboard. |
| Strategy | `430:19536` | Add section | Inline title/content entry, Approve & Save, Cancel. |
| Strategy | `430:12478` | Edit mode | Discard Changes, Save Changes, editable section blocks, per-section Regenerate with AI. |
| Moodboard | `430:10651` | Empty | Center empty state with Create Moodboard button. |
| Moodboard | `430:14477` | Figma link input | Link/upload segmented control, Figma link field, references grid, Create Moodboard. |
| Moodboard | `430:14751` | Upload input | Upload tab active, large dropzone, references grid. |
| Moodboard | `430:15031` | Uploaded files | Uploaded files list with trash icons beside dropzone. |
| Moodboard | `430:15804` | Analyzing | Center loading state with checklist. |
| Moodboard | `430:15338` | Patterns result | Reference thumbnails, structural pattern cards, Continue to Flows. |
| Flows | `438:24696` | Flow list | Flows/Screens tabs, approved flow rows, Add a flow manually, Send to FigJam. |
| Flows | `438:25160` | Flow details expanded | Flow metadata badges, step list, Edit Steps, See Less. |
| Flows | `438:25684` | Edit steps | Expanded step editor state, Discard Changes, Save Changes. |
| Flows | `430:21319` | Screens tab | Screen cards with flow-count badges and key elements. |
| Flows | `430:21896` | Edit screen elements | Editable key-elements card, Regenerate with AI, save/discard controls. |
| Flows | `430:7654` | Add flow modal | Modal over blurred page; title, description, type select, Add Steps. |
| Flows | `430:8122` | Add steps modal empty | Step input, Add Step, disabled-looking Save & Continue. |
| Flows | `430:8586` | Add steps modal filled | Multiple step rows and Save & Continue. |
| Wireframes | `430:18122` | Type selection empty | Lo-Fi and Hi-Fi cards, Continue disabled. |
| Wireframes | `430:18322` | Type selected | Hi-Fi selected card, Continue enabled. |
| Wireframes | `452:28438` | Brand kit upload empty | Upload brand kit dropzone, Back, Continue disabled. |
| Wireframes | `452:28638` | Brand kit uploaded | Uploaded `Brand_guideline.pdf` row with file size and trash. |
| Generate | `452:28851` | Generate setup with brand kit option | Screens list, selected count, Change Wireframe type, Add Brand Kit, layout preference, Generate 13 Wireframes. |
| Generate | `452:29192` | Generate setup without brand kit CTA | Same screen list, Change Wireframe type only. |
| Generate | `430:11505` | Creating wireframe | Center loading state with checklist: scanned moodboard, scanned flows, creating layouts, create wireframes. |
| Wireframes | `467:38506` | Lo-Fi results | Grid of generated wireframe cards, Open in Figma, Convert to High-fi. |
| Wireframes | `475:40404` | Hi-Fi results | Same generated wireframe grid with Hi-Fi title. |
| Assets | `430:22497` | Wireframes tab | Upload zone plus asset tabs; wireframe grid. |
| Assets | `430:22904` | Documents tab | Document cards with status badges Complete/Shared. |
| Assets | `430:23162` | Uploaded tab | Uploaded document cards with uploaded status. |
| Sharing | `467:39501` | Share with client | Modal, client portal link, team members add, Done, Copy. |
| Sharing | `467:39943` | Share upgrade gated | Modal with Upgrade plan badge/button and disabled add member. |

## Data And Behavior Mapping

### Shell, Sidebar, Header

Likely files:

- `app/src/components/layout/*`
- `app/src/components/sidebar/*`
- `app/src/components/projects/*`
- route/page file for project detail view

Tasks:

- Build/adjust a shared project shell matching the Figma frame.
- Replace active-state icon filters with explicit colors or SVG variants.
- Keep active Projects sidebar item dark with a white project icon only if it matches the collapsed-sidebar Figma state.
- Ensure expanded/sidebar text version keeps Dashboard icon black/gray, not white.

### Project Creation / Onboarding Correction

Likely files:

- Project creation flow component/hook
- Onboarding flow component/hook
- shared project type constants/types

Tasks:

- Restore the project-type step in the frontend flow.
- Show only `Web Design`, `App Design`, `Web App`.
- Submit only `web-design`, `app-design`, `web-app` for new projects.
- Do not remove legacy backend values.
- Do not default project type silently unless the user has selected one.

### Research

Likely data:

- Existing project AI context fields for client website, competitors, references, brief, notes.
- Existing run/artifact data for latest research and run history.

Tasks:

- Split research into setup, running, and completed states.
- Reuse existing save/run/regenerate actions where available.
- Render latest research as a single wide Figma-style report card, not two-column input/output unless the current state specifically requires setup.

### Strategy

Likely data:

- Strategy artifact sections.
- Per-section status: approved vs action required.

Tasks:

- Render approved and action-required sections differently.
- Support edit mode, add-section mode, save/discard, approve, regenerate.
- Keep bottom actions: Add Section, Add to Notion, Continue to moodboard.

### Moodboard

Likely data:

- References collected from Figma links/uploads.
- Extracted structural patterns.

Tasks:

- Add empty, collection, upload, uploaded-files, analyzing, and patterns-result states.
- Keep the copy focused on structural patterns, not visual style.
- Decide before implementation whether moodboard references are local draft state first or persisted in Convex.
- Continue to Flows only after patterns exist.

### Flows

Likely data:

- Flow artifact content from AI-generated strategy/moodboard output.
- Screen list derived from flows.

Tasks:

- Add Flows/Screens segmented tabs.
- Implement expandable flow rows.
- Implement edit steps state.
- Implement screens grid and edit-elements state.
- Add manual flow/steps modals.
- Wire Send to FigJam to the existing destination/export action if available.

### Generate / Wireframes

Likely data:

- Selected wireframe fidelity.
- Optional uploaded brand kit.
- Screens selected for generation.
- Generated wireframe artifacts and external Figma URLs.

Tasks:

- Implement Lo-Fi/Hi-Fi selection.
- Implement brand kit upload step.
- Implement generate setup screen with selected screen rows and layout preference.
- Implement generation loading state.
- Implement Lo-Fi and Hi-Fi results grids.
- Open in Figma buttons should use artifact destination URLs.

### Assets

Likely data:

- Generated wireframes.
- Generated/shared documents.
- Uploaded files.

Tasks:

- Add upload/dropzone at top.
- Add asset tabs: Wireframes, Documents, Uploaded.
- Render each asset type with the correct card layout/status badge.
- Reuse generated wireframe cards from Generate results where possible.

### Sharing

Tasks:

- Implement Share with client modal.
- Client portal link should be copyable.
- Team member invite should be available only when plan allows it.
- Upgrade-gated state must match Figma when team sharing is locked.

## Component Plan

Create or align shared components before building tab screens:

- `ProjectShell`
- `ProjectSidebar`
- `ProjectHeader`
- `ProjectTabs`
- `ProjectPanel`
- `StatusBadge`
- `GradientButton`
- `IconButton`
- `UploadDropzone`
- `GeneratedAssetCard`
- `EditableSectionCard`
- `FlowRow`
- `ProjectModal`

These should be small wrappers around existing app conventions, not a new design system.

## Verification Checklist

- Sidebar icons stay correct in default, hover, active, clicked, and expanded states.
- Project type step appears in project creation/onboarding with exactly three frontend choices.
- Existing legacy project records still load.
- Tab order and active tab styling match latest Figma.
- Each listed Figma state has a corresponding UI state or explicit implementation note.
- Upload/dropzone states do not resize unexpectedly.
- Modals blur/dim the background as shown.
- Run `npm run lint` or the repo's equivalent.
- Run `npm run typecheck` or the repo's equivalent.
- Start the app locally and compare the main states against Figma screenshots.

## Open Questions Before Implementation

Resolved decisions from review:

- The tab label should be `Generate` before wireframes exist and `Wireframes` once generated wireframes exist.
- Moodboard files should use R2 for file storage and Convex for metadata/state. Recommended behavior: create local draft rows while the user is selecting files/links, upload files to R2 when added or before `Create Moodboard`, then persist the reference records in Convex when the moodboard is created. This keeps file bytes out of Convex and keeps the database as the source of truth for what belongs to the project.
- Assets upload should support all file categories shown in Figma, with file-size limits by category.
- Share with client still needs implementation detail confirmation: the UI is clear, but we need to check whether current backend permissions/client portal logic already supports real shared access, team-member invites, copy link, and upgrade-gated behavior.

## Implementation Progress (28 April 2026)

### Completed

#### ResearchTab (`app/src/components/project/ResearchTab.tsx`)
- **Results view**: Sections now render based on content type (Competitors → side-by-side cards with green Strengths / red Weaknesses boxes; Opportunities → gray rounded box with bullet list; Key Insights → white card with purple bullets; default sections → clean text in white cards).
- **Edit mode**: Replaced single textarea with per-section gray boxes, each with its own `TextArea` and purple "Regenerate with AI" button.
- **Edit buttons**: "Discard Changes" styled red/destructive, "Save Changes" uses green gradient.
- **Redirect removed**: `window.location.assign` to `/agents/claude` removed from `launchResearchRun` and `sendToNotion`.

#### MoodboardTab (`app/src/components/project/MoodboardTab.tsx`)
- **Tab toggle**: Figma Link / Upload from Device changed from filled gradient buttons to underline-style tabs.
- **Description**: Updated to "Drop in screenshots or paste a figma link. Stage extracts structural patterns — not colors, typography or visual style."
- **Reference cards**: Now show image placeholder area, extracted display name, source type (Figma/Uploaded), and item count header. 3-column grid.
- **Upload drop zone**: Dashed border style with hover accent.
- **Loading state**: Updated description, added module icon, added Cancel button via `cancelRun` mutation.
- **Redirect removed**: `window.location.assign` to `/agents/claude` removed from `launchMoodboardRun`.

#### GenerateTab (`app/src/components/project/GenerateTab.tsx`)
- **Config screen** (matches Figma `452:28851`): Single-column screen list with descriptions. Pill colors: blue for type, rose for priority, stone for Required/Optional. Stats as plain text with dot separator. "+ Add Brand Kit" as purple text link. Dark square checkbox. Selected counter. Generate button with count + arrow, right-aligned.
- **Screen data**: Updated with descriptions and full P0–P6 priority range (Homepage, About Us, Features, Pricing, Testimonials, Blog, Contact Us).
- **Results view** (matches Figma `467:38506`): Title "Lo-Fi Wireframes" / "Hi-Fi Wireframes". "Convert to High-fi →" purple text button. Simplified cards: no summary, title + P0 purple pill on same line, gray "Open in Figma" button with Figma logo.
- **Loading state** (matches Figma `430:11681`): Uses wireframe icon from `app/public/logos/projects/`, updated title/description/steps, added Cancel button.
- **Redirect removed**: `window.location.assign` to `/agents/claude` removed from `launchGenerateRun` and `handleDestination`.

#### AssetsTab (`app/src/components/project/AssetsTab.tsx`)
- Grid spacing updated from `gap-1 p-1` to `gap-3 p-3`.
- File counts now dynamically computed from array lengths.
- Upload drop zone uses dashed border style.
- Wireframes grid breakpoint changed to `lg:grid-cols-3`.

#### StrategyTab (`app/src/components/project/StrategyTab.tsx`)
- **Redirect removed**: `window.location.assign` to `/agents/claude` removed from `launchStrategyRun` and `sendToNotion`.
- **Loading state**: Added module icon and Cancel button via `cancelRun` mutation.

#### FlowsTab (`app/src/components/project/FlowsTab.tsx`)
- **Redirect removed**: `window.location.assign` to `/agents/claude` removed from `launchFlowsRun` and `sendToFigJam`.
- **Loading state**: Added module icon and Cancel button via `cancelRun` mutation.

#### Shared primitives (`app/src/components/project/ProjectAiModulePrimitives.tsx`)
- `LoadingWorkflow` component updated: accepts optional `icon` (renders module SVG instead of spinner) and `onCancel` callback (renders Cancel button). Title size changed to 16px, description max-width 282px, step list uses inline items instead of card rows.

#### Backend (`app/convex/projectAi.ts`)
- Added `cancelRun` mutation: sets run status to `"failed"` with `"Cancelled by user"` message, enabling users to exit loading states.

### Not yet started

- Shell, sidebar, header, icon state fixes (items 1–3 in Implementation Order)
- Overview / Kanban tab
- Project creation / onboarding project-type correction
- Share modals
- Verification pass
- Many Figma states listed in Screen Inventory still need implementation (expanded flow details, edit steps, moodboard patterns result, brand kit uploaded state, etc.)

## What Not To Do

- Do not remove project type again.
- Do not collapse multiple Figma states into one generic card screen.
- Do not introduce backend schema changes as a side effect of UI work.
- Do not use icon filters that make all active icons white.
- Do not replace Figma-specific layout with broad dashboard styling.
