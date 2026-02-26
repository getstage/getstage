# STAGE — 03. Dashboard

## Overview
The Dashboard is the PRIMARY screen of Stage. It is a global creative timeline showing all projects across time. This is where the user orients themselves — it answers "where am I across all my work?"

The hero element is a large horizontal timeline. Everything else is secondary.

---

## Visual Hierarchy

```
Top Context (nav + summary)     → 10%
Timeline Hero                   → 60%
Secondary Info                  → 20%
Navigation                      → 10%
```

Whitespace is mandatory. The timeline must breathe.

---

## Layout

- Full-width page
- Global navigation at top (see 00-design-system.md)
- Content area below navigation
- No sidebar. No left panel. No right panel.

---

## Section 1 — Top Context Bar

### Purpose
Give a quick macro summary before the eye hits the timeline.

### Layout
- Full width, below global navigation
- Horizontal row, items spaced apart
- Compact — one line of content

### Elements (left to right)

1. **Greeting or page title**
   - Text: "Your Projects" or "Dashboard"
   - Style: Medium weight, primary text color, moderate size (not a huge heading)
   - Left-aligned

2. **Summary stats (right-aligned)**
   - Active projects count: "{X} active"
   - Style: Secondary text color, body size
   - Subtle, informational, not emphasized

3. **"+ New Project" button**
   - Style: Primary CTA or subtle secondary button
   - Right-aligned, next to or after the stats
   - On click: opens project creation modal (see 06-project-creation-modal.md)

### Visual Notes
- This section should be lightweight. It's context, not content.
- Do not add filters, search, view toggles, or sorting controls here. Not for v1.
- Total height: minimal — ~60–80px including padding.

---

## Section 2 — Timeline Hero

### Purpose
The core of Stage. A horizontal timeline showing all projects as blocks across time.

### Layout
- Full width with generous side padding
- Occupies the dominant vertical space on the page (~60%)
- Horizontally scrollable if projects extend beyond viewport

### Base Timeline Elements

1. **Horizontal timeline line**
   - Thin line (1–2px), light gray
   - Runs the full width of the timeline area
   - Represents time from left (earliest project start) to right (latest project end)

2. **Day/week markers**
   - Soft vertical tick marks along the timeline
   - Date labels below ticks: subtle, small text, secondary color
   - Density adapts to zoom level / timeframe:
     - Under 30 days: show individual day markers
     - 30–90 days: show week markers
     - 90+ days: show month markers
   - A subtle "Today" marker — slightly more visible vertical line or dot with "Today" label

3. **Project blocks**
   - Rounded rectangular blocks sitting on or above the timeline
   - Width corresponds to project duration (start date to end date)
   - Multiple projects stack vertically if they overlap in time
   - Stacking: no more than 4–5 visible rows before scrolling

### Project Block Contents
Each block contains only:

1. **Client avatar or initials**
   - Small circle, left side of block
   - Initials derived from client name, subtle background color

2. **Project name**
   - Primary text, truncated if too long
   - Next to the avatar

3. **Phase indicator**
   - Small text or subtle tag showing current phase name
   - Secondary text color, right side of block or below project name

**Nothing more inside the block.** No progress bars, no percentages, no task counts on the surface.

### Project Block Styling
- Background: White or very light, slightly elevated from timeline background
- Border: Very subtle or none
- Radius: 8–10px
- Height: Consistent across all blocks (~48–56px)
- Spacing between stacked blocks: 8–12px
- Active projects: Full opacity
- Completed projects: Reduced opacity, subtle visual shift (muted color or soft checkmark)

---

## Section 3 — Hover Interaction (Visitors.now Style)

### Purpose
Progressive disclosure. Hovering on the timeline reveals contextual detail without navigating away.

### Behavior

**When user hovers over a project block:**

1. **Vertical focus line** appears at the cursor's horizontal position on the timeline
   - Style: Thin vertical line, accent color at low opacity
   - Extends from top to bottom of the timeline area

2. **Background fade** — other project blocks subtly reduce in opacity (~30–40%)
   - Only the hovered project remains at full visibility
   - Smooth transition (200ms)

3. **Floating tooltip** appears near the cursor

### Tooltip Contents

```
{Date at cursor position}
{Project name}
{Current phase at this point in timeline}
─────────────────────────────────
☑ Completed task name
☑ Completed task name
☐ Upcoming task name          ● (if recently added)
☐ Upcoming task name
+{X} more
```

### Tooltip Rules
- **Phase shown:** Only the phase that falls under the cursor's position on the timeline. As the cursor moves left/right across the project block, the phase and tasks change.
- **Max items:** 4–5 checklist items visible. If more exist, show "+{X} more" at the bottom.
- **New items indicator:** A small dot (●) next to items added recently (within last 48 hours). Accent color, very subtle.
- **Completed items:** Show with checkmark (☑), muted text.
- **Incomplete items:** Show with empty checkbox (☐), primary text.
- **Read-only:** No interaction within the tooltip. Hovering is for viewing only.
- **Appearance:** Fade in with slight delay (150ms). No abrupt pop.
- **Position:** Floating near cursor, auto-positioned to avoid viewport edges.

### When cursor leaves the project block:
- Tooltip fades out (150ms)
- Focus line disappears
- All blocks return to full opacity
- Smooth transition back

---

## Section 4 — First-Time Contextual Tooltips

### Purpose
Replace a tutorial page. Teach the user through the interface itself on their first visit.

### Behavior
On the user's first dashboard visit (after onboarding), 2–3 tooltips appear attached to key UI elements. They appear sequentially — the next one shows when the previous is dismissed.

### Tooltip Sequence

**Tooltip 1 — The Timeline**
- Attached to: The project block on the timeline
- Text: "This is your project timeline. Hover over it to see progress details."
- Dismiss: "Got it" text link or click anywhere

**Tooltip 2 — Project Entry**
- Attached to: The project block
- Text: "Click a project to view phases and manage tasks."
- Dismiss: "Got it" text link

**Tooltip 3 — New Project**
- Attached to: "+ New Project" button
- Text: "Add more projects here as your workload grows."
- Dismiss: "Got it" text link

### Visual Style
- Small floating card with subtle shadow
- White background, soft radius
- Arrow/pointer indicating the attached element
- Text: Body size, concise
- Dismiss link: Accent color, small

### Rules
- Only shown once. After dismissal, never shown again.
- If user navigates away mid-sequence, remaining tooltips are skipped and never shown.
- Not blocking — user can interact with the interface while tooltips are visible.

---

## Click Actions on Dashboard

| Element | Action | Leads to |
|---------|--------|----------|
| Project block (click) | Navigate to project detail | Project Detail Page (04) |
| "+ New Project" button | Open creation modal | Project Creation Modal (06) |
| Profile avatar | Open dropdown | Profile dropdown menu |
| "Upgrade" link | Navigate to pricing | Paywall/Pricing (07) |
| "Settings" in dropdown | Navigate to settings | Settings Page (08) |
| "Log out" in dropdown | End session | Auth Screen (01) |

---

## Empty State (No Projects)

### When shown
If the user somehow has zero projects (edge case — shouldn't happen after onboarding, but possible if they delete all projects).

### Layout
- Centered on page, in the timeline area
- Replace timeline with empty state content

### Elements
1. **Message**
   - Text: "No projects yet."
   - Style: Primary text color, medium size, centered

2. **Subtitle**
   - Text: "Create your first project to get started."
   - Style: Secondary text color, body size, centered
   - Margin below: 24px

3. **CTA button**
   - Text: "Create your first project"
   - Style: Primary CTA, centered, comfortable width
   - On click: Opens project creation modal

### Visual Notes
- No illustrations, no mascots, no sad faces. Just clean text and a button.
- The empty state should feel calm and inviting, not empty and broken.

---

## Dashboard — Additional States

### Loading State
- Timeline area shows subtle placeholder shapes (skeleton loading)
- No spinner. Skeletons animate with a soft shimmer/pulse.
- Duration: As brief as possible. Perceived as instant ideally.

### Many Projects (Overflow)
- If projects extend beyond the horizontal viewport: horizontal scroll on the timeline
- If projects stack more than 4–5 rows: vertical scroll within the timeline area
- Consider a subtle scroll indicator or fade at the edges

### Completed Projects
- Remain on the timeline but with reduced visual weight
- Slightly muted opacity or subtle completed indicator
- They don't disappear — completed work is still part of the overview