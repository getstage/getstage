# STAGE — 05. Task Detail Page

## Overview
The task detail page is the deepest level of Stage's three-tier hierarchy: Dashboard → Project → Task. It opens when a user clicks on a checklist item from the project detail page.

The surface (project checklist) shows only the task title and checkbox. This page reveals the depth — notes, files, images, documents. It's a freeform content page for each task.

---

## Entry Transition
Clicking a checklist item text (not the checkbox) triggers a **zoom-in transition** — consistent with the Dashboard → Project transition pattern. The user is going one level deeper.

---

## Layout

- Full-width page
- Global navigation at top
- Breadcrumb navigation below global nav
- Content area: centered, max-width ~700px (comfortable reading/writing width)

---

## Section 1 — Breadcrumb & Context

### Layout
- Below global navigation
- Left-aligned
- Single horizontal line

### Elements

1. **Breadcrumb**
   - Format: "← {Project Name} · {Phase Name}"
   - Example: "← Website Redesign · Visual Direction"
   - "{Project Name}" is clickable — navigates back to project detail page
   - Style: Secondary text color, body size
   - The arrow and project name function as the back navigation

---

## Section 2 — Task Header

### Layout
- Below breadcrumb, top of the centered content container
- Full width of content container

### Elements

1. **Checkbox**
   - Same style as on the project checklist
   - Left-aligned or inline before the title
   - User can toggle completion from here
   - Checking/unchecking updates the project progress in real time (same feedback loop)

2. **Task title**
   - Large text, primary color, medium weight
   - Inline editable — click to edit, press Enter or click away to save
   - Should feel like a page title, not a form field
   - Margin below: 32px

---

## Section 3 — Freeform Content Area

### Purpose
A single, open canvas where the user can write notes and attach files. Not a structured form with separate sections — one continuous vertical flow.

### Layout
- Full width of content container (~700px)
- Vertical flow — content stacks top to bottom
- Starts empty with a placeholder

### Empty State
- Placeholder text in the content area:
  - "Add notes, upload files, or drop images here..."
  - Style: Secondary text color, body size, centered or left-aligned
- Click anywhere in the area to start typing

### Text Editing
- Basic rich text editing. NOT a full Notion-like editor. Keep it simple.
- Supported formatting:
  - Bold (Cmd/Ctrl + B)
  - Italic (Cmd/Ctrl + I)
  - Headings (H1, H2 — triggered by typing # or ##)
  - Bullet list (triggered by typing - or *)
  - Numbered list (triggered by typing 1.)
  - Links (Cmd/Ctrl + K or auto-detect URLs)
- **No formatting toolbar visible by default.** Formatting is triggered by keyboard shortcuts or markdown-style shortcuts.
- Optional: A minimal floating toolbar appears when text is selected (bold, italic, link). Small, unobtrusive. Disappears when selection is cleared.

### File Uploads
- **Drag and drop:** User can drag files directly into the content area
- **Click to upload:** A subtle "+" button or "Attach file" link at the bottom of the content area (or inline via a / command)
- Supported file types:
  - Images (jpg, png, gif, webp) — displayed inline as embedded images
  - PDFs — displayed as a file card (icon + filename + file size)
  - Documents (docx, etc.) — displayed as a file card
  - Other files — displayed as a generic file card
- **Image display:** Images dropped or uploaded appear inline within the text flow, full-width of the content container, with subtle rounded corners
- **File card display:** Non-image files appear as compact cards:
  ```
  [file icon]  filename.pdf  ·  2.4 MB  ·  [download icon]
  ```
  - Rounded container, subtle background, compact
  - Click to download or preview (if applicable)
- **File size limit:** Define per plan (e.g., 10MB per file free, 50MB paid). Show inline error if exceeded.
- **Upload progress:** Subtle inline progress bar on the file card during upload. No modal, no blocking overlay.

### Content Flow
Everything lives in one vertical stream:

```
Task Title
──────────────────

Some notes about this task. The client mentioned they want
a more minimal approach to the landing page.

[uploaded-image.png — displayed inline, full width]

Additional notes after the image. Key reference links:
- https://example.com/reference

[document.pdf · 2.4 MB · download]

More notes below...
```

The user types, drops files, and everything flows together naturally. Like writing a document with embedded media.

---

## What's NOT on This Page

- **No comments.** v1 is single-user. Comments come later with client portal enhancements.
- **No due dates.** The phase and project timeline handle timing.
- **No assignees.** v1 is single-user.
- **No labels, tags, or categories.** The task already lives within a phase within a project. That's enough context.
- **No activity log or history.** Keep it simple.
- **No sidebar.** The content area is the only thing on the page.

---

## Section 4 — Bottom Area

### Elements

At the very bottom of the content area, after all content:

1. **"Attach file" link** (always visible)
   - Text: "+ Attach file"
   - Style: Secondary text color, small, subtle
   - On click: Opens file picker
   - This ensures there's always a visible upload trigger even if the drag-and-drop affordance isn't obvious

---

## Click Actions Summary

| Element | Action | Leads to |
|---------|--------|----------|
| Breadcrumb project name / "←" | Navigate back | Project Detail Page (zoom-out) |
| Checkbox | Toggle task completion | Progress updates across project |
| Task title | Edit inline | Title updates |
| Content area | Type / edit notes | Content saves automatically |
| Drag file into content area | Upload file | File appears inline |
| "+ Attach file" | Open file picker | Selected file appears inline |
| File card (click) | Download or preview | File opens / downloads |

---

## Saving Behavior

- **Auto-save.** All changes (text edits, file uploads, title changes, checkbox toggles) save automatically.
- No "Save" button anywhere.
- Optional: A tiny, subtle "Saved" indicator near the top of the content area or in the breadcrumb bar. Appears briefly after changes, then fades. Very quiet.
- If save fails (network error): Subtle inline warning — "Changes not saved. Retrying..." — with automatic retry. No disruptive modal.

---

## States

### Empty Task (No Content)
- Placeholder text visible: "Add notes, upload files, or drop images here..."
- Checkbox and title still visible and functional
- The page doesn't feel broken — just ready for content

### Task with Content
- Text and files displayed in the vertical flow
- Everything editable inline

### Completed Task
- Checkbox is checked
- Content is still fully visible and editable
- No visual obstruction — just the checkbox state indicates completion
- Title may have subtle muted styling but remains readable

### Loading State
- Content area shows subtle skeleton placeholder
- Brief — should load quickly as it's a single task's content
