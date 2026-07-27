---
name: shadcn-ui-skill-stage
description: Stage-adapted shadcn/ui skill for Hi-Fi wireframe HTML.
source: https://github.com/shadcn-ui/ui/tree/main/skills/shadcn
---

# Stage Hi-Fi — shadcn/ui

Apply when generating Stage `generatedScreens[].html` fragments.

**Scope warning.** Upstream is a React + Tailwind skill: it teaches `<Button variant="outline">`, `cn()`,
`className`, the CLI, and the registry. Stage emits **self-contained HTML + one `<style>` block with no
Tailwind, no React, and no JavaScript**, so none of that is executable here. What transfers is shadcn's
*design language* — reproduce the look and the structural discipline in plain CSS.

## 1. Semantic tokens, never raw colors

Declare the shadcn token set once at the top of the `<style>` block and reference it everywhere:

```css
:root {
  --background: #ffffff;
  --foreground: #0a0a0a;
  --muted: #f5f5f5;
  --muted-foreground: #737373;
  --border: #e5e5e5;
  --primary: #171717;
  --primary-foreground: #fafafa;
  --destructive: #dc2626;
  --radius: 0.5rem;
}
```

Derive every value from the moodboard or brand kit. Never scatter one-off hex values through the sections, and
never use a raw green/red for status — route it through a token or a badge.

## 2. Variant vocabulary

Buttons come in the shadcn set — default, secondary, outline, ghost, destructive, link — and you pick one
rather than hand-styling a border and hover. Same for badges: default, secondary, outline, destructive.

## 3. Structure discipline

- **Card** = a bordered surface with distinct header, content, and footer bands. Do not merge them.
- **Dialogs and sheets always have a title.** No anonymous overlays.
- **Avatars always have a fallback** — initials when no image.
- **Empty states are a component, not an absence** — icon, headline, one line of guidance, one action.
- **Alerts carry a callout**, not a bare paragraph of coloured text.

## 4. Forms

Group with a fieldset and legend. Every field is `label` + control + optional description + optional error,
stacked in that order. Two to seven mutually exclusive options become a segmented toggle group, not a select.
Validation state is visible on the field, not only in a summary.

## 5. Spacing and sizing

- Use `gap` on a flex or grid container; never margin chains between siblings.
- Equal width and height means one square value, applied consistently to icons, avatars, and placeholders.
- Truncate long single-line text rather than wrapping it inside a control.
- Radius comes from `--radius`, not from per-element values.

## 6. Icons

Inline SVG only — never emoji. One stroke width, one size scale, aligned to the text baseline. Icons inside
buttons inherit the button's text color and sit at the same optical size as the label.
