---
name: design-taste-frontend-stage
description: Stage-adapted Taste skill for Hi-Fi wireframe HTML. Sourced from Leonxlnx/taste-skill (design-taste-frontend / tasteskill.dev) for Adrien’s backend quality test.
source: https://github.com/Leonxlnx/taste-skill
---

# Stage Hi-Fi — Taste skill (testing)

Apply this skill when generating Stage `generatedScreens[].html` fragments.
You are **not** shipping React/Tailwind app code — only **self-contained HTML + one `<style>` block**.

## 0. Design read (mandatory)

Before inventing layout, infer:

1. **Screen kind** — marketing landing, auth, onboarding/modal step, settings, dashboard, empty state, success.
2. **Vibe** from strategy/moodboard (minimal, editorial, B2B calm, consumer premium, etc.).
3. **Audience** — buyers, operators, consumers.
4. **Brand** — moodboard `styleGuides[]` / brand kit tokens win over defaults.

State silently (do not print outside JSON): *Reading as: \<screen kind> for \<audience>, \<vibe>, using brand tokens.*

## 1. Absolute bans (anti-slop)

- AI purple / indigo / violet glow gradients as the “default look”
- Inter / Roboto / Arial as the hero typeface when brand allows better system stacks
- Identical three equal feature cards every screen
- Generic glassmorphism everywhere
- Lorem ipsum / “Your Company” filler
- **Empty viewport shells:** `min-height: 100vh`, `height: 100vh`, or flex-centering a tiny dialog in a full desktop of white
- Absolute positioning soup; keep semantic flat markup (`header`, `section`, `main`, `h1`–`h3`, `p`, `ul`, `button`)

## 2. Canvas / spacing (Stage export + preview)

- **Root height = content.** No spacer divs whose only job is filling the viewport.
- **Modal / onboarding / invite / success:** content-sized card with 32–64px outer padding — not a postage stamp in a void.
- **Marketing / long pages:** stack sections with intentional gaps (typically 48–96px), alternating section backgrounds; no huge empty bands between blocks.
- Prefer split / asymmetric heroes over always-centered heroes when variance fits the vibe.

## 3. Hierarchy & system

- One spacing scale, one radius language, consistent shadows
- Strong type hierarchy (display vs body vs caption)
- Max one strong accent from the brand palette; neutrals do the work
- Realistic copy from strategy/research CTAs and value props
- At least one real image (Unsplash topic URL) or branded gradient block per screen when appropriate
- WCAG-AA text contrast

## 4. Layout diversification

Vary structure across screens in the set:

- Split hero (copy | media)
- Asymmetric feature rows
- Dense form column + brand panel (auth)
- Centered card **only** when the screen is truly a focused step — still content-sized, not 100vh-centered

## 5. Pre-flight before JSON

Every Hi-Fi screen `html` must:

1. Use brand colors/fonts from moodboard or brand kit
2. Contain real copy (no lorem)
3. Avoid 100vh empty centering
4. Look materially different in section rhythm from sibling screens
5. Stay flat/semantic for Figma layer extraction
