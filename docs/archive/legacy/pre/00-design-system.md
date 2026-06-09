# STAGE — 00. Design System & Global Elements

## Purpose
This file defines the shared design principles, global navigation, and reusable components that apply across every screen in Stage.

---

## Brand Identity

Stage should feel like:
- Visitors.now clarity
- Apple calmness
- Linear precision (lightly)

Stage should NOT feel like:
- A productivity hype tool
- A startup dashboard with charts everywhere
- An enterprise project management suite

**Light mode only.** No dark mode for v1.

---

## Logo

- **Full logo:** Stage wordmark with the S icon mark to the left. The S mark is a flowing, rounded double-curve shape.
- **Logo color:** Dark navy (#1A1A2E or near-black) on light backgrounds.
- **Usage in app:** Small logo in the top-left of the global navigation. Use the full logo (icon + wordmark) when space allows. Use the S icon mark alone only if space is extremely tight (e.g., favicon, mobile).
- **Clear space:** Maintain generous spacing around the logo. It should never feel cramped.
- **Logo file reference:** `FULaL_LOGO_-_Light_mode.png`

---

## Typography

### Heading Font: SF Pro Display
- Used for all headings, page titles, and prominent text elements
- Weights: Medium, Semibold, Bold
- SF Pro Display gives Stage an Apple-level polish and premium feel
- Used for: Screen titles, section headings, plan names, modal headlines, the greeting on the dashboard, onboarding headlines

### Body Font: DM Sans
- Used for all body text, labels, descriptions, input text, secondary information
- Weights: Regular, Medium
- DM Sans is clean, geometric, and highly legible at all sizes
- Used for: Paragraphs, button labels, input fields, tooltips, checklist items, breadcrumbs, secondary text, navigation items

### Type Scale (suggested)
| Role | Font | Weight | Size |
|------|------|--------|------|
| Page title / Hero heading | SF Pro Display | Semibold or Bold | 28–32px |
| Section heading | SF Pro Display | Medium or Semibold | 20–24px |
| Modal heading | SF Pro Display | Medium | 20–22px |
| Body text | DM Sans | Regular | 15–16px |
| Button label | DM Sans | Medium | 15–16px |
| Input text | DM Sans | Regular | 15–16px |
| Secondary / helper text | DM Sans | Regular | 13–14px |
| Small label / caption | DM Sans | Regular | 12–13px |

### Hierarchy Rules
- Hierarchy is achieved through font family contrast (SF Pro Display vs. DM Sans), size, and opacity — not excessive weight changes
- Headings in SF Pro Display naturally stand apart from DM Sans body text
- Avoid using more than 2 heading sizes on any single screen
- Never use all-caps for headings

---

## Color Palette

### Base
- **Background:** White (#FFFFFF) or very light warm gray (#FAFAF9) for page backgrounds
- **Surface:** White (#FFFFFF) for cards, modals, containers
- **Text primary:** Dark navy / near-black (#1A1A2E) — matches the logo color
- **Text secondary:** Medium gray (#8C8C8C)
- **Text tertiary:** Light gray (#BFBFBF)
- **Borders:** Very light gray (#E8E8E8) for subtle dividers and input borders

### Accent — Primary: Lavender Purple
- **Color:** Soft lavender purple (#9B8FD6 or similar — match the purple band in the branding image)
- **Usage:** Primary buttons, active states, selected pills, progress bar fills, accent indicators, phase active state, checkbox fills
- **Hover state:** Slightly darker shade (~#8A7EC5)
- **This is the signature Stage color.** It should appear in small, intentional doses throughout the product.

### Accent — Secondary: Cyan Blue
- **Color:** Bright cyan blue (#3BAFDA or similar — match the cyan/blue band in the branding image)
- **Usage:** Sparingly. Links, "Today" marker on timeline, secondary interactive elements, or as a subtle complement to the purple
- **Do not overuse.** The purple is primary. Cyan is a supporting accent.

### Overlay
- **Modal overlay:** Purple-tinted semi-transparent background. The dashboard remains visible but shifted into a calm lavender wash. Use the primary purple at ~15–20% opacity over a dark scrim (~40–50% black opacity). The overall effect should feel like a soft blue-purple haze, not a harsh darkening.

### Functional Colors
- **Success:** Soft muted green (#6BC9A0 or similar) for completed states
- **Destructive:** Soft muted red (#E07070 or similar) for delete actions only
- **Warning:** Soft amber (#E5A84B or similar) for paused states — used sparingly

### Color Rules
- No heavy saturation anywhere. All colors should feel muted, calm, and premium.
- The lavender purple accent appears in small doses — buttons, active indicators, progress fills, checkboxes.
- The dark navy (#1A1A2E) is used for primary text AND the logo. This creates a unified brand feel.
- White and off-white dominate every screen. Color is the exception, not the rule.
- **Light mode only.** All color values are defined for light backgrounds.

---

## Spacing & Layout

- **Base unit:** 8px grid system.
- **Page margins:** Generous. Minimum 48–64px on sides for desktop.
- **Section spacing:** 32–48px between major sections.
- **Element spacing:** 12–16px between related elements.
- **Whitespace is mandatory.** When in doubt, add more space.

---

## UI Elements

### Buttons
- **Primary CTA:** Filled with lavender purple (#9B8FD6). White text (DM Sans Medium). Rounded corners (8–10px radius). Calm, not loud. Medium padding (12–16px vertical, 24–32px horizontal).
- **Primary hover:** Slightly darker purple (#8A7EC5). Smooth transition.
- **Secondary:** Ghost/outline style. Subtle border (light gray or purple tint), no fill. Dark text.
- **Destructive:** Ghost style with soft red text. Only in settings/delete contexts.
- **Disabled:** Reduced opacity (~40–50%) of the primary style. Not a different color.
- **Size:** Comfortable click targets. Never tiny. Minimum height ~44px.

### Input Fields
- **Style:** Minimal. Thin border (#E8E8E8) or subtle bottom underline. Rounded corners (6–8px). White background.
- **Placeholder text:** Light gray (#BFBFBF), DM Sans Regular.
- **Focus state:** Border color transitions to lavender purple. Subtle transition (200ms).
- **Label:** DM Sans Medium, small size (13–14px), positioned above the field with 6–8px spacing.
- **Error state:** Border color shifts to soft red. Error message below in soft red, small text.

### Cards / Containers
- **Background:** White (#FFFFFF)
- **Border:** None or 1px very light gray (#E8E8E8)
- **Shadow:** None or barely perceptible. Depth through spacing and background contrast, not shadow.
- **Radius:** 10–14px rounded corners.

### Tooltips (Timeline Hover)
- **Background:** Dark navy (#1A1A2E) — creates strong contrast and premium feel
- **Text:** White for primary content, light gray for secondary
- **Radius:** 8–10px.
- **Shadow:** Soft, subtle.
- **Content:** Compact text (DM Sans), minimal padding (12–16px).
- **Behavior:** Appears on hover with slight delay (150–200ms). Fades in, does not pop.

### Toggle Pills
- **Style:** Rounded pill shapes for selectable options (project type, role, etc.).
- **Inactive:** Light gray background (#F0F0F0), dark text (#1A1A2E).
- **Active:** Lavender purple background (#9B8FD6), white text.
- **Spacing:** 8–12px gap between pills.
- **Radius:** Full pill (999px or height/2).
- **Font:** DM Sans Medium, 14–15px.

### Checkboxes
- **Style:** Rounded square (4–6px radius). Border color: light gray (#D0D0D0) when unchecked.
- **Checked state:** Lavender purple fill (#9B8FD6) with white checkmark. Smooth transition animation (200ms).
- **Size:** 18–20px. Comfortable to click.

### Progress Indicators
- **Style:** Thin horizontal bar (4–6px height). Rounded ends.
- **Background (track):** Very light gray (#F0F0F0).
- **Fill color:** Lavender purple (#9B8FD6).
- **Text:** Percentage shown as secondary text (DM Sans Regular) next to or above the bar.
- **Animation:** Fill width animates smoothly when progress changes.

### Toggle Switches
- **Track:** Light gray when off, lavender purple when on.
- **Thumb:** White circle.
- **Transition:** Smooth slide (200ms).

---

## Global Navigation (Present on All Authenticated Screens)

### Layout
- Horizontal top bar, full width, fixed to top
- Background: White (#FFFFFF)
- Minimal height (~56–64px including padding)
- Bottom border: 1px very light gray (#F0F0F0) or no border at all
- Padding: 0 48–64px (match page margins)

### Elements (left to right)

**Left:**
- Stage logo (S icon + "Stage" wordmark, small size, dark navy color)
- On project detail and task detail screens: "← Dashboard" or "← {Project Name}" text link in DM Sans, secondary color. Replaces or sits next to the logo.

**Center:**
- Empty. Nothing in the center. Clean.

**Right:**
- "Upgrade" text link (DM Sans Medium, lavender purple color) — hidden if already on paid plan
- Profile avatar or initials circle (click opens dropdown)
  - Circle: 32–36px, light gray background with dark navy initials (DM Sans Medium)
  - If avatar uploaded: image fills the circle

### Profile Dropdown
Triggered by clicking the avatar/initials.

**Content:**
```
User's full name          (DM Sans Medium, primary color)
user@email.com            (DM Sans Regular, secondary color)
─────────────────         (1px light gray divider)
Settings                  (DM Sans Regular, primary color)
─────────────────
Log out                   (DM Sans Regular, primary color)
```

**Style:**
- Small floating card, right-aligned below avatar
- White background
- Subtle shadow (barely perceptible)
- 8–10px radius
- Padding: 16–20px
- Min-width: ~200px
- Items have hover state: light gray background (#F5F5F5)

---

## Transitions & Animations

- **Page transitions:** Smooth, subtle. No hard cuts. Zoom-in feeling when going deeper (Dashboard → Project → Task). Reverse zoom when going back.
- **Modal open:** Purple-tinted overlay fades in (300ms), modal scales up slightly from center (200ms ease-out).
- **Modal close:** Reverse of open. Smooth fade out.
- **Hover states:** Subtle opacity changes, underlines, or color shifts. Never abrupt. All transitions ~150–200ms.
- **Checkbox toggle:** Smooth purple fill animation (200ms).
- **Progress updates:** Animated number/bar changes. Never instant jumps.
- **Timeline project appearance (after creation):** New block fades and slides into position on the timeline.
- **Button hover:** Background color darkens slightly, smooth transition (150ms).

---

## Responsive Notes (V1)

- **Primary target:** Desktop (1280px+ viewport).
- **Secondary:** Tablet landscape.
- **Mobile:** Not a priority for v1. The timeline hero experience is designed for horizontal space.
- **Client portal:** Should be reasonably responsive (clients may view on mobile). See 09-client-portal.md.
- All modals should remain centered and scale down gracefully.

---

## Iconography

- Use icons extremely sparingly.
- When used: thin line icons, consistent stroke width (1.5–2px), simple shapes.
- Never decorative. Only functional (e.g., back arrow, share, more menu dots, drag handle).
- **Icon color:** Inherits text color — dark navy for primary, gray for secondary.
- No colored icons. No filled icons. Line style only.
- Recommended icon set: Phosphor Icons (light weight) or similar minimal line icon library.

---

## Empty States

Every screen that can be empty must have a designed empty state:
- Headline in SF Pro Display, medium weight
- Subtitle in DM Sans, secondary text color
- A single CTA button (lavender purple) if applicable
- No illustrations or mascots. Just text and a button.
- Example: "No projects yet." + "Create your first project" button.

---

## Brand Color Summary (Quick Reference)

| Token | Value | Usage |
|-------|-------|-------|
| `--color-bg` | #FFFFFF | Page background |
| `--color-bg-subtle` | #FAFAF9 | Subtle background variation |
| `--color-surface` | #FFFFFF | Cards, modals |
| `--color-text-primary` | #1A1A2E | Primary text, logo |
| `--color-text-secondary` | #8C8C8C | Secondary text, labels |
| `--color-text-tertiary` | #BFBFBF | Placeholder text, muted |
| `--color-border` | #E8E8E8 | Borders, dividers |
| `--color-border-subtle` | #F0F0F0 | Very subtle borders |
| `--color-accent-purple` | #9B8FD6 | Primary accent (buttons, active states) |
| `--color-accent-purple-hover` | #8A7EC5 | Purple hover state |
| `--color-accent-cyan` | #3BAFDA | Secondary accent (links, markers) |
| `--color-success` | #6BC9A0 | Completed states |
| `--color-destructive` | #E07070 | Delete actions |
| `--color-warning` | #E5A84B | Paused state |