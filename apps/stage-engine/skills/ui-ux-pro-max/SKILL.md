---
name: ui-ux-pro-max-stage
description: Stage-adapted nextlevelbuilder UI UX Pro Max skill for Hi-Fi wireframe HTML.
source: https://github.com/nextlevelbuilder/ui-ux-pro-max-skill
---

# Stage Hi-Fi — UI UX Pro Max

Apply when generating Stage `generatedScreens[].html` fragments.
Upstream targets native/mobile app UI and ships CSV datasets plus Python search scripts. Stage generates
**self-contained HTML + one `<style>` block** for desktop-first screens, so the touch-target, safe-area, and
platform-gesture rules do not translate. What follows is the web-applicable subset of its pro rules.

## 1. Icons and visual elements

- **No emoji as structural icons.** Emoji are font-dependent and cannot be themed. Use inline SVG.
- **Consistent sizing.** Pick one icon scale (e.g. 16 / 20 / 24px) and hold it. Never mix 20 / 24 / 28
  arbitrarily on the same screen.
- **Stroke consistency.** One stroke width per visual layer — 1.5px or 2px, not both.
- **Filled vs outline discipline.** One icon style per hierarchy level.
- **Icon alignment.** Align to the text baseline with consistent padding around the glyph.
- **Icon contrast.** 4.5:1 for small elements, 3:1 minimum for larger glyphs.

## 2. Interaction states

- Every interactive element shows a pressed or hover state within 80–150ms.
- Micro-interactions stay in the 150–300ms band.
- **Press states must not shift layout bounds.** Use color, opacity, or elevation — never a transform that
  moves surrounding content.
- Disabled controls look disabled and carry the `disabled` attribute. Nothing may look clickable and do
  nothing.
- Use semantic elements (`button`, `a`, `label`, `input`) rather than generic containers as controls.

## 3. Contrast

- Body text ≥ 4.5:1 against its surface; secondary text ≥ 3:1.
- Borders and dividers must stay visible — do not rely on a hairline that vanishes against the background.
- Pressed, focused, and disabled states stay equally distinguishable.
- Modal scrims sit around 40–60% black so foreground content is isolated.
- Drive color from a small token set at the top of the `<style>` block, not from per-section hex values.

## 4. Layout and spacing

- **4/8px rhythm** for padding, gaps, and section spacing. No random increments.
- **Vertical rhythm tiers** by hierarchy — e.g. 16 / 24 / 32 / 48 — applied consistently.
- **Consistent content width** across sibling screens.
- **Readable measure.** Do not run long-form paragraphs edge to edge; cap the line length.

## 5. Pre-delivery check

Before returning the fragment, verify:

- No emoji used as an icon; all icons share one family and style
- Every interactive element has a visible focus state
- Primary text ≥ 4.5:1, secondary ≥ 3:1
- 4/8px spacing rhythm holds at component and section level
- Color is not the only indicator of meaning
- Form fields have labels and, where relevant, hint or error text
