# STAGE — 04. Project Detail Page

## Overview
The project detail page is the execution layer. The user enters here from the dashboard by clicking a project block. It shows the phase roadmap, the active checklist, and project-level context. This is where progress happens.

---

## Entry Transition
From the dashboard, clicking a project block triggers a **zoom-in transition** — the block expands into the full project detail page. This reinforces the mental model of going deeper (Dashboard → Project). The reverse (clicking back) reverses the animation — zooming back out to the dashboard.

---

## Layout

- Full-width page
- Global navigation at top with "← Dashboard" back link on the left
- Three vertical sections: Top Bar, Phase Roadmap (hero), Checklist

---

## Section 1 — Top Bar (Project Context)

### Purpose
Provide at-a-glance project identity and progress.

### Layout
- Full width, below global navigation
- Horizontal row
- Compact — one to two lines max

### Elements (left to right)

**Left group:**
1. **Project name**
   - Style: Medium-large text, primary color, medium weight
   - The most prominent text on this bar

2. **Client name**
   - Style: Body size, secondary text color
   - Separated from project name by a subtle dot or dash divider
   - e.g., "Website Redesign · Acme Studio"

**Center or right group:**
3. **Progress percentage**
   - Text: "{X}%"
   - Style: Body size, secondary text color
   - Accompanied by a subtle thin progress bar (horizontal, ~80–120px wide)
   - Fill color: Accent color
   - When project is 100%: Text changes to "Complete" in soft green

4. **Status indicator**
   - Small text label or subtle pill: "Active", "Paused", or "Completed"
   - Style: Muted, secondary. Not loud.

**Far right:**
5. **Share button**
   - Icon: Minimal share icon or text "Share"
   - Style: Ghost/secondary button
   - On click: Opens share modal (see Share section below)

6. **More menu (...)**
   - Three-dot icon
   - On click: Opens dropdown with project actions

### More Menu Dropdown Contents
```
Edit project name
Edit client
Adjust timeline
Add or remove phases
─────────────────
Pause project
─────────────────
Delete project
```

- "Delete project" in soft red text
- Delete triggers a confirmation dialog: "This will permanently delete this project and all its data. This cannot be undone." with "Cancel" and "Delete" buttons.

---

## Section 2 — Phase Roadmap (Hero)

### Purpose
Visualize the project lifecycle as a horizontal sequence of phases. This is the hero element of the page.

### Layout
- Full width with generous side padding
- Horizontal arrangement of phase blocks
- Vertically centered in its section
- Occupies ~30–40% of the page height

### Phase Block Elements
Each phase is a distinct visual block in a horizontal row:

1. **Phase name**
   - Text: e.g., "Strategy", "Research", "Wireframe"
   - Style: Body size, primary text color for active phases

2. **Status indicator**
   - Visual state: upcoming, active, or completed
   - Upcoming: Muted/gray, subtle appearance
   - Active: Emphasized — accent color border, slightly larger, or highlighted background
   - Completed: Muted with subtle checkmark or completed styling (soft green tint or reduced opacity)

3. **Completion percentage**
   - Text: e.g., "4/6" or "67%"
   - Style: Small text below phase name, secondary color
   - Based on checklist items (completed / total)

### Phase Block Styling
- Connected blocks in a horizontal row with subtle connecting lines or seamless flow
- Active phase is visually dominant — slightly larger, accent border, or elevated
- Completed phases: muted but still readable
- Upcoming phases: subtle, lower opacity
- Spacing between phases: 8–16px
- Radius: 8–10px per block

### Phase Click Behavior
- Clicking any phase selects it
- The checklist below (Section 3) updates to show that phase's items
- Active phase is selected by default on page entry
- Selected state: accent underline, border, or background shift
- Transition between phases is smooth — checklist content fades/slides

---

## Section 3 — Checklist (Work Layer)

### Purpose
The execution surface. Shows checklist items for the currently selected phase.

### Layout
- Below the phase roadmap
- Centered or slightly left-aligned container, max-width ~600–700px
- Vertical list of items

### Section Header

1. **Phase name**
   - Text: Current selected phase name
   - Style: Small heading or emphasized body text
   - Margin below: 4px

2. **Completion count**
   - Text: "{X} of {Y} complete"
   - Style: Secondary text, small
   - Margin below: 24px

### Checklist Item Structure
Each item in the list:

```
[checkbox] Task title text                              [→]
```

1. **Checkbox**
   - Left side
   - Rounded style (see design system)
   - Click to toggle complete/incomplete
   - Smooth animation on check

2. **Task title**
   - Center, primary text color
   - Truncated if very long (single line)
   - Click on text: navigates to Task Detail Page (05)
   - Inline editable: double-click or specific edit trigger to rename

3. **Chevron or arrow indicator**
   - Right side, very subtle (tertiary color)
   - Indicates there is a detail page to open
   - Only visible on hover or always subtle — either approach works

### Checklist Item States
- **Incomplete:** Full opacity, empty checkbox
- **Complete:** Checkbox filled (accent + checkmark), text gets muted or subtle strikethrough
- **Hover:** Subtle background highlight on the row
- **Recently added:** Optional subtle "new" dot (accent color) — same as dashboard hover

### Checklist Actions

**Add new item:**
- Below the last item: a text input or clickable area
- Placeholder: "Add a task..."
- Behavior: User types and presses Enter to add. Item appears in the list immediately.
- Style: Subtle, not a full button. Inline feel.

**Reorder items:**
- Drag handle on left side of each item (subtle grip icon, visible on hover)
- Drag and drop to reorder within the phase

**Delete item:**
- On hover: subtle trash icon or "×" appears on the right side of the item
- Click to delete. No confirmation modal for individual items — immediate removal with a brief "Undo" toast at the bottom of the screen (3 seconds).

---

## Progress Feedback Loop

When a checklist item is checked:
1. The checkbox animates to filled state
2. The phase completion count updates ("3 of 6 complete" → "4 of 6 complete")
3. The phase block in the roadmap updates its percentage
4. The overall progress percentage in the top bar ticks up
5. All updates are animated smoothly, not instant jumps

This creates a satisfying chain: check an item → see progress ripple up to the project level.

---

## Phase Transitions

When all items in a phase are checked:
- The phase block transitions to "completed" visual state
- The next phase with incomplete items becomes the new "active" phase
- The checklist auto-switches to the new active phase
- Transition is smooth — the user sees the shift happen

**Nothing is locked or gated:**
- User can always click back to a completed phase
- User can uncheck items in completed phases
- User can add new items to any phase at any time
- Phases don't have hard gates between them

---

## Share Modal

### Trigger
Click the "Share" button in the top bar.

### Appearance
Centered modal with blue overlay (same pattern as project creation).

### Elements (top to bottom)

1. **Headline**
   - Text: "Share with client"
   - Margin below: 24px

2. **Client access toggle**
   - Label: "Client access"
   - Toggle switch: on/off
   - When toggled on: shareable link is generated and displayed below

3. **Shareable link field** (visible only when toggle is on)
   - Read-only input showing the URL
   - "Copy" button next to it
   - Click copy: button text changes to "Copied!" for 2 seconds
   - Margin below: 16px

4. **Optional: email field**
   - Label: "Or send directly"
   - Placeholder: "client@email.com"
   - "Send" button next to it
   - Sends an email with the link to the client
   - Margin below: 24px

5. **Permission note**
   - Text: "Clients can view project progress, phases, and task details. They cannot make changes."
   - Style: Small text, secondary color

6. **Close button**
   - "Done" button or "×" close icon in top-right of modal

### States
- **Toggle off:** Only the toggle is visible. Link and email fields are hidden.
- **Toggle on:** Link field appears with smooth expand animation. Copy button ready.
- **Gated (free plan, if applicable):** Toggle is disabled. Message: "Upgrade to share with clients." with "Upgrade" link. (Only if you go with free tier.)

---

## Click Actions Summary

| Element | Action | Leads to |
|---------|--------|----------|
| "← Dashboard" | Navigate back | Dashboard (zoom-out transition) |
| Phase block (click) | Select phase | Checklist updates to show that phase |
| Checklist item (click text) | Open task detail | Task Detail Page (05) |
| Checklist item (click checkbox) | Toggle completion | Progress updates across page |
| "Add a task..." | Add new item | New item appears in checklist |
| "Share" button | Open share modal | Share modal |
| "..." menu | Open project actions | Dropdown with edit/pause/delete options |
| "Delete project" | Confirmation dialog | Delete or cancel |

---

## Additional States

### Loading State
- Phase roadmap shows skeleton blocks
- Checklist shows skeleton rows
- Smooth shimmer animation

### Empty Phase (No Checklist Items)
- Checklist area shows:
  - Text: "No tasks in this phase yet."
  - "Add a task..." input below
- Clean, not sad. Just informational.

### Paused Project
- Top bar shows "Paused" status in muted orange or yellow
- Everything is still visible and editable
- Paused is a label, not a functional lock

### Completed Project
- Progress shows "Complete" instead of percentage
- All phases show completed state
- Checklist items are all checked
- Still fully editable — user can reopen or add items
