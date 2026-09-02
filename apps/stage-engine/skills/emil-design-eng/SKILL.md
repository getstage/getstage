---
name: emil-design-eng-stage
description: Interaction-craft guidance for Stage Hi-Fi React screens.
source: https://github.com/emilkowalski/skills/tree/main/skills/emil-design-eng
---

# Stage Hi-Fi — Design Engineering

**Role:** make interactions feel intentional through compounded details. Apply after the shared visual system and screen hierarchy are decided.

## Frequency decides motion

- Repeated keyboard actions and controls used hundreds of times: no animation.
- Frequent list, navigation, and hover interactions: subtle feedback only.
- Occasional modals, drawers, toasts, and disclosures: clear short transitions.
- First-time or showcase moments: expressive motion is allowed when it explains or demonstrates something.

Every transition needs a purpose: state feedback, spatial continuity, hierarchy, or explanation. No purpose means no motion.

## Motion vocabulary

- Press feedback: roughly 100–160ms.
- Tooltips and small popovers: roughly 125–200ms.
- Dropdowns and selects: roughly 150–250ms.
- Modals and drawers: roughly 200–500ms.
- Enter/exit generally uses responsive ease-out; in-place movement uses ease-in-out; color/hover uses ease.
- Prefer `transform` and `opacity`; avoid layout-triggering animation.
- Keep one easing vocabulary and duration scale across sibling components.

## React and static consumers

- Use `motion/react` only for meaningful live behavior. CSS hover/focus/active states remain required.
- Never make the initial state blank, hidden, or `opacity: 0`. Animate from a complete visible frame because Figma and thumbnails capture the resting state.
- Anchor popovers to their trigger; modals may use the viewport center. Never scale an element from zero.
- Respect reduced motion and provide non-hover equivalents for touch and keyboard users.
