# Onboarding + Creation Figma Redesign — 2026-04-20

Implements the Figma flow from [Stage — Onboarding Updated](https://www.figma.com/design/1r1quTKtqFy9E2UZt3rnOd/Stage-%3C%3E-Main?node-id=126-1687) across the onboarding modal, project creation page, and paywall/pricing surfaces. Scope list: `docs/listClaude.md`.

## Visual system

- White page backgrounds; gray outer card `#F4F4F5`, white inset `rounded-[12px]`
- Inputs `#F5F5F7`, lavender accent `--color-accent`
- SF Pro Display headings / DM Sans body
- Continue buttons use `ArrowRight` (Phosphor)
- Step indicator is pill-shaped `StepDots`, rendered at page/modal chrome level (not per step)

## Files changed

### Onboarding
- **`app/src/components/onboarding/OnboardingModal.tsx`** — Stage logo top-left, dynamic H2+subtitle per step, `StepDots` top-right, arrow Continue button, modal width `560px`.
- **`app/src/components/onboarding/OnboardingPrimitives.tsx`** — New `StepShell` primitive: gray outer card + white inset with optional label.
- **`app/src/components/onboarding/OnboardingStepRenderer.tsx`** — All steps wrapped in `StepShell`, in-step headers removed:
  - `personalise` → "Field of work"
  - `details` → "Project Basics" + "Cover (Optional)"
  - `client` → "Client Details"
  - `project-type` → icon cards (`PROJECT_TYPE_ICONS` map)
  - `method` → Smart vs Manual radio + purple connected-dot roadmap preview
  - `integrations` → Claude / Codex / Figma / Notion rows; Google Sheets + Stripe moved into "Advanced" disclosure
  - `phase-select`, `timeline`, `preview` → shelled; preview shows connected purple-dot roadmap
- **`app/src/components/onboarding/OnboardingPaywall.tsx`** — Single Pro card, `PRO_FEATURES` restyled to `{ icon, label }[]` with Phosphor icons (`Briefcase`, `FolderSimple`, `HardDrives`, `Headset`, `Sparkle`, `Stack`), lavender-tinted inset, "See All Plans" CTA with arrow.

### Project creation
- **`app/src/components/creation/ProjectCreationPage.tsx`** — Page-level chrome mirrors modal (logo + H2/subtitle + `StepDots`), max-width `520px`, chrome hidden on `generating`/`success`.
- **`ProjectBasicsStep`, `ProjectTypeStep`, `MethodStep`, `RoadmapStep`, `ClientStep`, `PhasesStep`, `TimelineStep`** — `StepDots` removed (now in page chrome); unused `currentIndex`/`steps` props prefixed with `_` to pass strict TS.

### Downstream pricing consumers
- **`app/src/components/billing/UpgradePricingModal.tsx`** — Uses `feature.label` from new `PRO_FEATURES` shape.
- **`app/src/components/landing/sections/PricingSection.tsx`** — Same update.

### Docs
- **`docs/listClaude.md`** — Figma node list per onboarding screen (kept as source of truth).

## Verification

- `npm run build` passes.
- No TS errors, no unused-variable warnings.
