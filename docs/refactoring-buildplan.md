# Component Refactoring Buildplan

> Doel: de 5 grootste component-bestanden opsplitsen in kleinere, herbruikbare onderdelen met aparte hooks, constanten en sub-componenten — zonder functionele wijzigingen.

## Huidige situatie

| Bestand | Regels | Functies | Probleem |
|---------|--------|----------|----------|
| `ProjectCreationPage.tsx` | 1017 | 33 | 100 regels config/constanten inline, 13 handler functies, 6 sub-componenten, alles in 1 file |
| `ProjectDetailPage.tsx` | 781 | 14 | 5 inline modals, error/feedback logica, datum-utils, sub-componenten |
| `SettingsPage.tsx` | 746 | 26 | 3 tabs in 1 component, feedback logica, file uploads, icon componenten, utils |
| `LandingPage.tsx` | 696 | 13 | FAQ/pricing constanten inline, 5 mockup-componenten, alles in 1 file |
| `DashboardPage.tsx` | 618 | 14 | Currency formatters, dock/hover logica, timeline selector, constanten |

**Totaal: ~3.858 regels in 5 files, `hooks/` map is leeg, `lib/` bevat alleen 3 files.**

---

## Refactoring strategie

### Principes
1. **Geen functionele wijzigingen** — alleen verplaatsen en opsplitsen
2. **Eén file = één verantwoordelijkheid** — max ~200 regels per component
3. **Custom hooks voor state-logica** — alles met `useState`/`useEffect`/`useCallback` combos
4. **Constanten/config apart** — arrays, objecten, opties → `lib/constants.ts`
5. **Utility functies apart** — formatters, parsers → `lib/utils.ts` of `lib/format.ts`

---

## Fase 1: Shared utilities & constants

### `lib/constants.ts` [NEW]
Verplaats vanuit diverse files:
- `PROJECT_TYPES` array (uit `ProjectCreationPage`)
- `DEFAULT_PHASES` array (uit `ProjectCreationPage`)
- `AI_ROADMAPS` record (uit `ProjectCreationPage`)
- `FAQ_ITEMS` array (uit `LandingPage`)
- `PRICING_FEATURES` / `FREE_PRICING_FEATURES` (uit `LandingPage`)
- `DEFAULT_PORTAL_COLOR` (uit `SettingsPage`)

### `lib/format.ts` [NEW]
Verplaats vanuit diverse files:
- `formatCurrency`, `formatCompactCurrency`, `formatCurrencyDisplay` (uit `DashboardPage`)
- `formatDateInput`, `parseDateInput` (uit `ProjectDetailPage`)
- `formatInputDate`, `addDays`, `parseInputDate` (uit `ProjectCreationPage`)
- `normalizeHex`, `capitalize`, `formatPlanPrice` (uit `SettingsPage`)

### `lib/utils.ts` [UPDATE]
Verplaats helpers die nu in component-files staan:
- `readFileAsDataUrl` (uit `SettingsPage`) — herbruikbaar voor file uploads
- `getGreeting` (uit `DashboardPage`)

---

## Fase 2: Custom hooks

### `hooks/useFeedback.ts` [NEW]
Extraheer uit `SettingsPage`:
- `SaveFeedback` type, `IDLE_FEEDBACK`, `SAVED_FEEDBACK`
- `showFeedback` callback + timer cleanup
- Herbruikbaar in `ProjectDetailPage` (error banner)

### `hooks/useActionError.ts` [NEW]
Extraheer uit `ProjectDetailPage`:
- `actionError` state + `showError` met auto-dismiss timer + cleanup

### `hooks/useDock.ts` [NEW]
Extraheer uit `DashboardPage`:
- Alle dock hover/sizing logica (`dockSizes`, `activeDockIndex`, `handleDockMouseMove`, refs)

### `hooks/useProjectCreation.ts` [NEW]
Extraheer uit `ProjectCreationPage`:
- Alle form state (step, method, phases, roadmap, etc.)
- `handleContinue`, `goBack`, `handleCreate`, `handleViewProject`
- Phase manipulation (`togglePhase`, `addPhase`, `renamePhase`, `reorderPhases`)

---

## Fase 3: Sub-componenten per feature

### `settings/` directory
```
settings/
├── SettingsPage.tsx          ← container met tabs (slank, ~80 regels)
├── GeneralTab.tsx            ← naam + avatar + delete account
├── BillingTab.tsx            ← plan + payment method + stripe
├── PortalTab.tsx             ← logo + kleur + custom domain + preview
├── SettingsIcons.tsx         ← GeneralIcon, BillingIcon, PortalIcon
└── FeedbackText.tsx          ← move naar ui/ (herbruikbaar)
```

### `project/` directory
```
project/
├── ProjectDetailPage.tsx     ← container (slank, ~120 regels)
├── ProjectHeader.tsx         ← naam, avatar, progress, dropdown menu
├── PhaseNavigation.tsx       ← fase-node pipeline
├── TaskChecklist.tsx         ← takenlijst + inline add-task input
├── EditProjectNameModal.tsx  ← Radix Dialog
├── EditClientModal.tsx       ← Radix Dialog
├── AdjustTimelineModal.tsx   ← Radix Dialog
├── EditPhasesModal.tsx       ← Radix Dialog
├── DeleteProjectModal.tsx    ← Radix Dialog (destructief)
├── ShareModal.tsx            ← bestaande share modal (al apart te trekken)
├── PhaseNode.tsx             ← bestaande sub-component
└── TaskRow.tsx               ← bestaande sub-component
```

### `creation/` directory
```
creation/
├── ProjectCreationPage.tsx   ← container + nav (slank, ~100 regels)
├── steps/
│   ├── ProjectNameStep.tsx   ← step 1: naam + client + avatar
│   ├── ProjectTypeStep.tsx   ← step 2: type selectie
│   ├── MethodStep.tsx        ← step 3: AI vs manual
│   ├── TimelineStep.tsx      ← step 4a/4mb: datum selectie
│   ├── PhaseSelectStep.tsx   ← step 4m: fase toggle/drag/reorder
│   └── RoadmapPreview.tsx    ← step 5: preview + create
├── StepCard.tsx              ← animatie wrapper
├── PrimaryButton.tsx         ← move naar ui/ (herbruikbaar)
├── BackButton.tsx            ← move naar ui/ (herbruikbaar)
├── StepDots.tsx              ← stap indicator
└── GeneratingAnimation.tsx   ← "Generating your roadmap..." state
```

### `landing/` directory
```
landing/
├── LandingPage.tsx           ← container (slank, ~150 regels)
├── HeroSection.tsx           ← hero + CTA
├── FeaturesSection.tsx       ← feature cards grid
├── PricingSection.tsx        ← pricing tabel
├── FAQSection.tsx            ← accordion
├── CTASection.tsx            ← bottom CTA
├── FeatureCard.tsx           ← bestaande component
├── SmallFeatureCard.tsx      ← bestaande component
├── PortalMockup.tsx          ← mockup component
└── PaymentMockup.tsx         ← mockup component
```

### `dashboard/` directory
```
dashboard/
├── DashboardPage.tsx         ← container (slank, ~100 regels)
├── DashboardStats.tsx        ← compact stats row
├── UpcomingTasks.tsx         ← InfoCard met taken
├── RecentActivity.tsx        ← InfoCard met activiteit
├── PaymentsCard.tsx          ← InfoCard met betalingen
├── ProjectDock.tsx           ← macOS-style dock
├── TimelineDateSelector.tsx  ← bestaande component (al apart file-worthy)
└── InfoCard.tsx              ← bestaande wrapper component
```

---

## Fase 4: Opruimen

- [ ] Verwijder alle verplaatste code uit de originele files
- [ ] Controleer dat imports correct zijn
- [ ] `pnpm typecheck` — moet groen zijn
- [ ] Visuele controle dat niets gebroken is

---

## Volgorde van uitvoering

| Stap | Wat | Risico |
|------|-----|--------|
| 1 | `lib/constants.ts` + `lib/format.ts` aanmaken | Laag — alleen verplaatsen |
| 2 | Custom hooks extraheren | Medium — state-logica verplaatsen |
| 3 | `LandingPage` opsplitsen | Laag — geen state-dependencies |
| 4 | `DashboardPage` opsplitsen | Laag — weinig cross-dependencies |
| 5 | `SettingsPage` opsplitsen | Medium — tabs + feedback logica |
| 6 | `ProjectDetailPage` opsplitsen | Medium — modals + error state |
| 7 | `ProjectCreationPage` opsplitsen | Hoog — complexe multi-step flow |
| 8 | Final typecheck + cleanup | Laag |

> [!IMPORTANT]
> Elke stap wordt afgesloten met een typecheck. Zo vangen we fouten vroeg.

---

## Verwacht resultaat

| Metric | Nu | Na refactoring |
|--------|-----|----------------|
| Grootste file | 1017 regels | ~150 regels |
| Files in `hooks/` | 0 | 4+ |
| Files in `lib/` | 3 | 5+ |
| Sub-componenten per feature | 1 | 4-12 |
| Herbruikbare UI components | 7 | 10+ |
