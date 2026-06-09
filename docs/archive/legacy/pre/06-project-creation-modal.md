# STAGE — 06. Project Creation Modal

## Overview
When the user clicks "+ New Project" on the dashboard, a centered modal opens over a blue-tinted overlay. The dashboard remains visible in the background — dimmed and shifted into a calm blue wash.

This flow mirrors the onboarding project creation but in a lighter, faster container. The user is experienced now — they don't need full-screen hand-holding.

---

## Overlay & Modal Container

### Overlay
- Semi-transparent blue-tinted background
- Dashboard content visible beneath, blurred slightly or dimmed
- ~60–70% opacity
- Click outside modal: closes modal (with confirmation if data has been entered)
- Escape key: closes modal

### Modal Container
- Centered horizontally and vertically
- Max-width: ~520px
- Background: White
- Radius: 12–16px
- Padding: Generous (32–40px)
- No heavy shadow — the overlay provides enough contrast
- Close icon: Small "×" in top-right corner, tertiary color

---

## Modal Content — Multi-Step Flow

The content inside the modal changes step by step. Each step replaces the previous content with a smooth transition (fade or subtle slide). The modal container stays the same size and position.

A subtle **step indicator** at the top of the modal content (small dots or thin progress line) shows progress through the steps.

---

## Step 1 — Project Name & Client

### Elements (top to bottom)

1. **Step title**
   - Text: "New Project"
   - Style: Medium weight, primary color, moderate size
   - Margin below: 32px

2. **Project name input**
   - Label: "Project name"
   - Placeholder: "Website Redesign"
   - Type: text
   - Full width within modal
   - Auto-focus
   - Margin below: 20px

3. **Client name input**
   - Label: "Client"
   - Placeholder: "Acme Studio"
   - Type: text with auto-suggest
   - If user has existing clients, dropdown suggests matching names as they type
   - Full width within modal
   - Margin below: 32px

4. **Continue button**
   - Text: "Continue"
   - Style: Primary CTA, full width
   - Disabled until both fields have content

---

## Step 2 — Project Type

### Elements (top to bottom)

1. **Step title**
   - Text: "Project type"
   - Margin below: 32px

2. **Type selection**
   - Style: Grid of selectable pills or compact cards (2 columns)
   - Options: Branding, Web Design, Product Design, App Design, Packaging, Motion Design, Illustration, Other
   - Single select
   - Margin below: 32px

3. **Continue button**
   - Text: "Continue"
   - Disabled until a type is selected

4. **Back link**
   - Text: "← Back"
   - Style: Small text link, secondary color, top-left of modal content or below the button
   - Returns to Step 1 with data preserved

---

## Step 3 — AI or Manual

### Elements (top to bottom)

1. **Step title**
   - Text: "Build your roadmap"
   - Margin below: 32px

2. **Two option cards (stacked vertically within modal — horizontal may be too tight)**

   **Card A — AI-Generated**
   - Title: "AI-Generated"
   - Description: "Tailored phases and tasks based on your project type."
   - Selectable card

   **Card B — Manual**
   - Title: "Manual Setup"
   - Description: "Choose your own phases and add tasks as you go."
   - Selectable card

   - Single select
   - Selected state: accent border
   - Margin below: 32px

3. **Continue button**
   - Text: "Continue"
   - Disabled until selection is made

4. **Back link**

---

## Step 4A — Timeline (AI Path)

### Elements (top to bottom)

1. **Step title**
   - Text: "Project timeline"
   - Margin below: 32px

2. **Start date picker**
   - Label: "Start date"
   - Default: Today
   - Compact date picker
   - Margin below: 20px

3. **End date picker**
   - Label: "End date"
   - Default: Empty or 30 days from today
   - Validation: Must be after start date
   - Margin below: 32px

4. **Generate button**
   - Text: "Generate Roadmap"
   - Style: Primary CTA, full width
   - On click: Brief generation animation within the modal (1–1.5 seconds — shorter than onboarding), then auto-advance to Step 5

5. **Back link**

### Generation Moment (within modal)
- Modal content is replaced with a subtle centered animation + "Creating your roadmap..." text
- Duration: 1–1.5 seconds (snappier than onboarding)
- Auto-advances to Step 5 (Preview)

---

## Step 4M — Phase Selection (Manual Path)

### Elements (top to bottom)

1. **Step title**
   - Text: "Select phases"
   - Margin below: 32px

2. **Phase list**
   - Same as onboarding manual path:
     - Vertical list of default phases
     - Drag handle + phase name + toggle switch
     - All toggled on by default
     - Draggable to reorder
   - Compact styling to fit within modal
   - Margin below: 12px

3. **Add phase link**
   - Text: "+ Add phase"
   - Style: Accent color text
   - Adds editable row
   - Margin below: 32px

4. **Continue button**
   - Text: "Continue"
   - Disabled if fewer than 2 phases active

5. **Back link**

---

## Step 4M-b — Timeline (Manual Path)

### Elements
Same as Step 4A (Timeline) but:
- Button text: "Continue" (not "Generate Roadmap")
- On click: directly advances to Step 5 (no generation animation)

---

## Step 5 — Roadmap Preview

### Elements (top to bottom)

1. **Step title**
   - Text: "Your roadmap"
   - Margin below: 8px

2. **Subtitle**
   - Text: "You can adjust everything later."
   - Style: Secondary text color
   - Margin below: 24px

3. **Roadmap visualization**
   - Horizontal phase sequence within the modal width
   - Compact version of the onboarding roadmap preview
   - Each phase: name + task count (AI) or "0 tasks" (manual)
   - Scrollable horizontally if needed within the modal
   - This is the hero of this final step
   - Margin below: 32px

4. **Create button**
   - Text: "Create Project"
   - Style: Primary CTA, full width
   - On click: Modal closes → overlay fades → project animates onto dashboard timeline

5. **Back link**

---

## After Creation

1. Modal closes smoothly (fade out + scale down)
2. Blue overlay fades out (300ms)
3. Dashboard is fully visible again
4. New project block **animates into position** on the timeline (fade in + slide from above or scale up)
5. Brief toast or no feedback needed — the new block appearing IS the feedback

---

## Flow Summary

### AI Path
```
Step 1 (Name + Client)
→ Step 2 (Type)
→ Step 3 (AI or Manual — selects AI)
→ Step 4A (Timeline + Generate)
→ [Generation animation 1.5s]
→ Step 5 (Preview)
→ Create → Modal closes → Project on timeline
```

### Manual Path
```
Step 1 (Name + Client)
→ Step 2 (Type)
→ Step 3 (AI or Manual — selects Manual)
→ Step 4M (Phase Selection)
→ Step 4M-b (Timeline)
→ Step 5 (Preview)
→ Create → Modal closes → Project on timeline
```

---

## Edge Case — Plan Limit Reached

If the user has reached their project limit (free plan, if applicable):
- Clicking "+ New Project" does NOT open this modal
- Instead: A simpler centered modal appears with:
  - Text: "You've reached your project limit"
  - Subtitle: "Upgrade to add more projects."
  - CTA: "Upgrade" button → navigates to pricing/paywall
  - "Maybe later" text link → closes modal
- Same blue overlay, same modal styling, just different content
