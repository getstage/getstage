---
name: design-motion-principles-stage
description: Stage-adapted design-motion-principles skill for Hi-Fi wireframe HTML.
source: https://github.com/kylezantos/design-motion-principles
---

# Stage Hi-Fi — Motion Principles

Apply when generating Stage `generatedScreens[].html` fragments.
Stage output is **self-contained HTML + one `<style>` block, no JavaScript**. Upstream's Create/Audit mode
routing and Framer Motion recipes do not apply — only CSS-expressible motion and the decision framework do.

## 1. The frequency gate

Before adding any motion, ask how often the user triggers it:

| Frequency | Recommendation |
|---|---|
| Rare (monthly) | Expressive motion welcome |
| Occasional (daily) | Subtle, fast |
| Frequent (100s/day) | No animation |
| Keyboard-initiated | Never animate |

## 2. Duration by context

| Context | Guideline |
|---|---|
| Productivity UI | Under 300ms — 180ms ideal |
| Production polish | 200–500ms for smoothness |
| Creative / playful | Whatever serves the effect |

Do not universally cap durations — weight by what the screen actually is. A SaaS dashboard and a kids' app
have opposite defaults.

## 3. The golden rule

> The best animation is the one that goes unnoticed.

If every interaction would make someone say "nice animation", the motion is too prominent for production.
Playful and consumer contexts are the exception, where delight is the goal.

## 4. Accessibility is not optional

Every animation must handle `prefers-reduced-motion`. No exceptions. Wrap motion in
`@media (prefers-reduced-motion: no-preference)`, or neutralise it inside a `reduce` block.

## 5. What this means without JavaScript

Since Stage fragments carry no script, express motion through:

- CSS `transition` on `:hover`, `:focus-visible`, and `:active`
- `@keyframes` for ambient or page-load motion, never for interaction the user can interrupt
- Structural depth (layering, shadow, offset) that implies movement without needing it
- Clear enter and exit anchors so the screen reads as animatable even when static
