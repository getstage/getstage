---
name: frontend-design-stage
description: Visual-direction guidance for distinctive Stage Hi-Fi React screens.
source: https://github.com/anthropics/skills/tree/main/skills/frontend-design
---

# Stage Hi-Fi — Frontend Design

**Role:** establish a specific visual direction. Apply when the screen needs persuasion, storytelling, or a memorable product expression. Project evidence and the shared run-level design plan always win.

## Direction

- Start from the product, audience, and this screen's single job. Borrow visual language from the subject's real world, not a generic SaaS template.
- State one concrete aesthetic thesis. “Modern”, “clean”, “premium”, and “professional” are not theses without specific type, layout, material, and content choices.
- Spend boldness in one place: one signature composition, interaction, type treatment, or product demonstration. Keep supporting UI disciplined.
- Match complexity to the direction. Maximalism needs deliberate layers; minimalism needs exceptional spacing, typography, alignment, and restraint.

## Composition

- Let information hierarchy determine layout. Do not default every screen to a centered heading followed by equal cards.
- Use structural labels, numbering, dividers, and badges only when they encode real meaning.
- Vary layout archetypes across different screen roles while keeping the shared design system intact.
- Use real product copy and data. Generic feature slogans, invented metrics, and decorative status labels make the design feel generated.

## Typography and assets

- Give display, body, label, and data text distinct roles. Preserve the project typography when supplied.
- Avoid the same fashionable serif/neutral pairing for unrelated projects.
- Prefer real product imagery, provided brand assets, or actual component previews. Do not fake product screenshots with meaningless rectangles.

## React execution

- Compose verified RAG-retrieved component sources; primitives support the design but are not the design.
- Tailwind and Motion may refine the composition, but must not create a second palette or component system.
- The live preview may animate; the initial/static frame must already be complete for Figma.
- Remove decoration that does not serve hierarchy, comprehension, or interaction.
