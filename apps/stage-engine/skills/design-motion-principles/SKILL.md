---
name: design-motion-principles-stage
description: Run-level motion-system guidance for Stage Hi-Fi React screens.
source: https://github.com/kylezantos/design-motion-principles
---

# Stage Hi-Fi — Motion Principles

**Role:** define the run's motion system and spatial choreography. Use it only when explicitly selected; it complements interaction craft rather than requiring animation everywhere.

## Decide before animating

For each planned motion, record:

- trigger: load, hover, press, selection, navigation, disclosure, or data change
- purpose: feedback, orientation, continuity, hierarchy, or delight
- frequency: rare, occasional, frequent, or keyboard-driven
- resting state: the complete frame captured by Figma
- reduced-motion behavior

Rare moments may be expressive. Daily interactions stay subtle and fast. Very frequent or keyboard-driven actions should not animate.

## Choreography

- Preserve spatial causality: expansion originates from its trigger; navigation indicates where content came from and went.
- Stagger only small related groups and keep the delay short. Do not make users wait for content to appear.
- Entrance and exit may be asymmetric, usually with a faster exit.
- Ambient loops are reserved for a genuine focal/showcase element and must not compete with task content.
- Different screens share one duration/easing vocabulary even when their amount of motion differs.

## React and accessibility

- Use `motion/react` for interruptible stateful transitions and CSS for simple hover/focus/active feedback.
- Animate transform and opacity where possible; do not animate layout properties without a concrete need.
- The initial/static frame must be visible, legible, and complete.
- Honour `prefers-reduced-motion`; remove decorative movement without removing information or feedback.
