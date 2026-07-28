---
name: emil-design-eng-stage
description: Stage-adapted emilkowalski design-engineering skill for Hi-Fi wireframe HTML.
source: https://github.com/emilkowalski/skills/tree/main/skills/emil-design-eng
---

# Stage Hi-Fi — Design Engineering

Apply when generating Stage `generatedScreens[].html` fragments.
You are **not** shipping React/Framer Motion code — only **self-contained HTML + one `<style>` block**, no JS.
Upstream spring/gesture guidance therefore does not apply; everything below is the CSS-expressible subset.

## 1. Unseen details compound

Most details users never consciously notice — that is the point. The aggregate of invisible correctness is
what makes an interface feel considered. Consistency of the small things outranks any single flourish.

## 2. Animate only what earns it

Ask how often the user would see the interaction:

| Frequency | Decision |
|---|---|
| 100+ times/day (shortcuts, palette toggles) | No animation, ever |
| Tens of times/day (hover, list navigation) | Drastically reduce |
| Occasional (modals, drawers, toasts) | Standard transition |

Every transition needs a purpose: spatial consistency, state indication, or explanation. No purpose → no
transition.

## 3. Easing

- Entering or exiting → `ease-out` (starts fast, feels responsive)
- Moving or morphing in place → `ease-in-out`
- Hover or color change → `ease`

## 4. Duration

| Element | Duration |
|---|---|
| Button press feedback | 100–160ms |
| Tooltips, small popovers | 125–200ms |
| Dropdowns, selects | 150–250ms |
| Modals, drawers | 200–500ms |

`ease-out` at 200ms *feels* faster than `ease-in` at 200ms, because movement is visible immediately.

## 5. Component reflexes

- **Buttons respond:** `transform: scale(0.97)` on `:active` with `transition: transform 160ms ease-out`.
- **Never scale from 0:** nothing in the real world vanishes completely. Enter from `scale(0.9)` plus opacity.
- **Popovers are origin-aware:** scale from the trigger, not from center. Modals are the exception — they keep
  `transform-origin: center` because they are not anchored to a trigger.
- **Prefer CSS transitions over keyframes** for anything a user can interrupt.
- **Blur masks imperfect transitions.**

## 6. Performance

Animate `transform` and `opacity` only. Anything that triggers layout is off the table.

## 7. Accessibility is not optional

Every transition sits inside a `@media (prefers-reduced-motion: reduce)` guard that removes or neutralises it.
Hover-only affordances must have a non-hover equivalent, because touch devices have no hover.

## 8. Cohesion

Enter and exit are allowed to be asymmetric (exit usually faster), but the whole screen shares one easing
vocabulary and one duration scale. Two different easing curves on sibling elements read as sloppiness.
