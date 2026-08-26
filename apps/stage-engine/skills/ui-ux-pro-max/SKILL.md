---
name: ui-ux-pro-max-stage
description: Design-system and usability guidance for Stage Hi-Fi React screens.
source: https://github.com/nextlevelbuilder/ui-ux-pro-max-skill
---

# Stage Hi-Fi — UI UX Pro Max

**Role:** define a coherent, usable design system. Apply to every product surface, especially operational, form, dashboard, and information-dense screens. Do not choose the visual thesis when another selected skill owns visual direction.

## System

- Reuse one shared type scale, color-role system, spacing rhythm, radius scale, elevation vocabulary, icon family, and motion vocabulary across the run.
- Use 4/8px spacing increments and clear hierarchy tiers rather than arbitrary gaps.
- Keep sibling screens on a consistent content grid while allowing page-specific density and layout archetypes.
- Drive color through project/library tokens. Do not scatter hardcoded section colors or create a competing theme.

## Hierarchy and task fit

- Organize around the user's primary decision or action, not around available components.
- Distinguish primary, secondary, and destructive actions. Keep an action's name stable through the flow.
- Use tables for comparable rows, lists for scanning, forms for input, and charts only for real relationships.
- Empty, loading, error, disabled, selected, and success states must communicate the next action clearly.

## Interaction and accessibility

- Use semantic `button`, `a`, `label`, `input`, and table elements.
- Every interactive element needs visible hover, focus-visible, active, and disabled treatment where applicable.
- Body text and small controls require strong contrast; color cannot be the only signal.
- Form fields need labels and relevant hint/error text. Touch and keyboard users must receive equivalent affordances.
- Keep controls stable under interaction; feedback must not shift surrounding layout.

## Responsive and delivery check

- Preserve readable measures and prevent fixed/sticky controls from hiding content.
- Keep icon size, stroke style, and alignment consistent within each hierarchy level; use Lucide rather than emoji.
- Verify hierarchy, focus visibility, contrast, labels, spacing rhythm, and responsive overflow before returning TSX.
