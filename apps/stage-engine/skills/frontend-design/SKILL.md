---
name: frontend-design-stage
description: Stage-adapted Anthropic frontend-design skill for Hi-Fi wireframe HTML.
source: https://github.com/anthropics/skills/tree/main/skills/frontend-design
---

# Stage Hi-Fi — Frontend Design

Apply when generating Stage `generatedScreens[].html` fragments.
You are **not** shipping React/Tailwind app code — only **self-contained HTML + one `<style>` block**.

## 1. Ground it in the subject

Design as a studio lead whose client already rejected templated proposals. Before layout, name the concrete
subject, its audience, and the screen's single job. Distinctive choices come from the subject's own world —
its materials, instruments, artifacts, vernacular — not from a general-purpose web look.

## 2. The hero is a thesis

Open with the most characteristic thing in the subject's world. A big number with a small label, supporting
stats, and a gradient accent is the template answer — use it only if it is genuinely the best option here.

## 3. Typography carries the personality

Pair display and body faces deliberately; not the families you would reach for on any other project. Set a
clear scale with intentional weights, widths, and spacing. The type treatment itself should be memorable, not
a neutral delivery vehicle.

## 4. Structure is information

Structural devices — numbering, eyebrows, dividers, labels — must encode something true about the content.
`01 / 02 / 03` markers are only appropriate when the content really is a sequence. Question every such device
before using it.

## 5. Calibration — the three AI defaults

Current AI-generated design clusters around three looks. Where the brief leaves an axis free, do **not** spend
that freedom on:

1. Warm cream background (near `#F4F1EA`) + high-contrast serif display + terracotta accent
2. Near-black background + a single acid-green or vermilion accent
3. Broadsheet layout with hairline rules, zero border-radius, dense newspaper columns

All three are legitimate for some briefs. Where the moodboard or brand kit pins a direction, the brief's own
words always win — including when it asks for one of these looks.

## 6. Match complexity to the vision

Maximalist directions need elaborate execution; minimal directions need precision in spacing, type, and detail.
Elegance is executing the chosen vision well.

## 7. Spend your boldness in one place

Pick one signature element that the screen is remembered by. Keep everything around it quiet and disciplined,
and cut decoration that does not serve the brief. Before finishing, remove one accessory.

## 8. Copy is design material

- Write from the user's side of the screen. Name things by what people control, never by how the system works.
- Active voice. A control says what happens: "Save changes", not "Submit".
- An action keeps its name through the flow: a "Publish" button produces a "Published" confirmation.
- Errors explain what went wrong and how to fix it; they never apologize and are never vague.
- An empty screen is an invitation to act, not a mood.
- Sentence case, plain verbs, no filler. Each element does exactly one job.

## 9. CSS specificity

Watch selector specificity so classes do not cancel each other out — especially section-level versus
element-level padding and margin rules inside the single `<style>` block.
