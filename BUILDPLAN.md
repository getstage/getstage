# Stage — Build Plan

Werkdocument. Alles wat nodig is om Stage te bouwen van specs naar productie.

---

## 0. Product & Visie

### Wat is Stage?

Stage is een SaaS projectmanagement tool gebouwd specifiek voor **creatieve professionals** — freelance designers, design studio's, in-house design teams, en agencies. Het is geen generiek PM-tool. Het is gebouwd voor mensen die klantprojecten runnen met duidelijke fases (Strategy → Research → Design → Development → Launch) en die hun klanten op een premium manier willen laten meekijken.

### Het kernprobleem

Designers en freelancers gebruiken tools die niet voor hen gebouwd zijn. Asana, Monday, Notion — die zijn te complex, te druk, te enterprise. Of ze gebruiken helemaal niks en sturen screenshots en spreadsheets naar klanten. Het gevolg:

- **Geen overzicht:** "Waar sta ik over al mijn projecten?" is een vraag die niemand snel kan beantwoorden
- **Slechte klantcommunicatie:** Klanten vragen constant "hoe staat het ervoor?" omdat er geen gedeeld beeld is
- **Geen structuur:** Fases, taken, en deadlines leven in het hoofd van de designer of verspreid over tools

### De oplossing

Stage geeft creatieve professionals **één rustpunt** voor al hun projectwerk:

1. **Dashboard met tijdlijn** — Eén blik op alle projecten over tijd. Geïnspireerd door Visitors.now: een horizontale curve met project-avatars, hover voor detail. Dit is het hart van Stage. Het beantwoordt direct: "waar sta ik?"
2. **Project fases & checklist** — Elk project heeft fases (Strategy, Design, Development, etc.) met taken per fase. Afvinken → zien hoe het project vordert. De feedback loop (vink af → progress bar groeit → percentage stijgt) is bewust verslavend.
3. **Client portal** — Met één klik deel je een read-only view van het project met je klant. De klant ziet fases, taken, en voortgang — zonder dat ze iets kunnen aanpassen. Premium uitstraling. "Powered by Stage" onderaan = virale groei.
4. **AI-generated roadmaps** — Kies je project type, Stage genereert een roadmap met fases en taken. Instant waarde, lage drempel.

### Voor wie?

| Segment | Omschrijving | Pijn |
|---------|-------------|------|
| **Freelance designers** | Solo, 3-8 klantprojecten tegelijk | Geen overzicht, klanten vragen constant om updates |
| **Design studio's** | Klein team (2-10), 10-20 projecten | Projecten lopen door elkaar, onboarding van nieuwe projecten is chaotisch |
| **In-house designers** | Werken binnen een bedrijf, meerdere stakeholders | Moeten voortgang communiceren naar niet-designers |
| **Agencies** | Grotere teams, veel klantprojecten | Client-facing communicatie is een bottleneck |

De primaire doelgroep voor lancering is **freelance designers en kleine studio's**. Dit zijn mensen die:
- Op Mac werken (belangrijk voor SF Pro Display font)
- Visueel zijn ingesteld (design moet premium aanvoelen)
- Bereid zijn te betalen als het hun werk simpeler maakt
- Actief op Instagram en TikTok (waar onze klant 300K volgers heeft)

### Business model

- **Free tier:** Beperkt aantal projecten (bijv. 2-3), geen client portal
- **Pro plan (€XX/jaar):** Ongelimiteerde projecten, client portal, AI roadmaps
- **Alleen jaarlijks eerst** — snelle validatie van betalingsbereidheid, lagere churn
- **Paywall is niet blokkerend** — gebruikers ervaren eerst waarde, dan upgrade prompt op natuurlijke momenten (4e project aanmaken, "Share with client")

### Design filosofie

Stage moet aanvoelen als:
- **Visitors.now** qua helderheid — data-gedreven maar clean
- **Apple** qua rust — veel witruimte, weinig kleur, ademruimte
- **Linear** qua precisie — subtiel, doordacht, geen overbodige elementen

Stage moet NIET aanvoelen als:
- Een productiviteitstool met overal badges en notificaties
- Een startup dashboard vol grafieken
- Enterprise PM software met sidebars en filters

**Light mode only.** Geen dark mode in v1. Eén kleuraccent: lavender purple (#8782F5). Spaarzaam gebruikt. Wit en off-white domineren elk scherm.

### De drie niveaus

```
Level 1: Dashboard      → macro overzicht van alle projecten over tijd
Level 2: Project Detail → mid-level: fases en checklist van één project
Level 3: Task Detail    → micro-level: notities en bestanden van één taak
```

Elke level dieper = zoom-in transitie. Terug = zoom-out. De gebruiker weet altijd waar die is.

### Navigatie flow

```
Landing Page (/) → Auth (/auth) → Onboarding → Dashboard (/dashboard)
                                                     ↓
                                              Project Detail (/project/:id)
                                                     ↓
                                              Task Detail (/project/:id/task/:id)

Dashboard → New Project (/new-project)
Dashboard → Settings (/settings)
Project Detail → Share → Client Portal (/portal/:token) [apart, public]
```

### Conversie strategie

Dit product wordt gelanceerd door een designer met **300K volgers** op Instagram en TikTok. De launch strategie:

1. **Landing page** met "early access" framing → email capture
2. **Jaarlijks plan only** → snelle revenue validatie
3. **Onboarding creëert direct eerste project** → instant waarde
4. **Client portal "Powered by Stage"** → designer deelt portal met klant → klant ziet Stage → wordt zelf gebruiker
5. **Progress feedback loop** → vink taak af → zien hoe project vordert → dopamine → terugkomen

### Wat er al klaar is (specs & prototypes)

De klant (designer) heeft **alles voorbereid**:

| Bestand | Inhoud |
|---------|--------|
| `00-design-system.md` | Volledige design tokens: kleuren, typografie, spacing, componenten, animaties |
| `01-auth-flow.md` | Email input + 6-digit verificatie code, routing logica |
| `03-dashboard.md` | Timeline hero, project blocks, hover interactie, tooltips, empty states |
| `04-project-detail.md` | Phase roadmap, checklist, progress feedback, share modal |
| `05-task-detail.md` | Freeform content, text editing, file uploads, auto-save |
| `06-project-creation-modal.md` | Multi-step flow: naam, type, AI/manual, timeline, preview |
| `08-settings.md` | Profiel, plan & billing, clients, account deletion |
| 8 HTML prototypes | Pixel-perfect interactieve prototypes van elk scherm |
| Design referentie afbeeldingen | Visitors.now dashboard, timeline curve, graph states |

Dit is een uitzonderlijk compleet startpunt. Elke state, elke interactie, elke edge case is beschreven. De prototypes tonen exact hoe het eruit moet zien.

---

## 1. Stack Beslissingen

| Laag | Keuze | Waarom |
|------|-------|--------|
| **Runtime** | Cloudflare Workers | Edge deployment, SPA fallback, ~0ms cold start |
| **Frontend** | React 19 | SPA — alles achter auth behalve landing + portal |
| **Routing** | TanStack Router (file-based) | Type-safe params, `beforeLoad` auth guards, auto code-splitting |
| **Server State** | TanStack Query v5 | Caching, invalidation, optimistic updates. Nu met mock data, later met backend |
| **CSS** | Tailwind CSS v4 (Vite plugin) | CSS-native theming, `@theme` directive voor Stage design tokens |
| **UI Primitives** | Radix UI (direct, geen shadcn) | Accessible dropdowns/modals/tooltips. Stage design is te custom voor shadcn defaults |
| **Animaties** | Motion (Framer Motion v12) | Zoom transitions (Dashboard→Project→Task), modal animations, progress bars |
| **Icons** | Phosphor Icons (light weight) | Spec zegt "thin line icons, 1.5-2px stroke". Phosphor light past perfect |
| **Fonts** | SF Pro Display (system) + DM Sans (Google Fonts) | Headings: `-apple-system, 'SF Pro Display'`. Body: `'DM Sans'` |
| **Build** | Vite 6 | Snelle HMR, native Cloudflare plugin support |
| **Rich Text** | Tiptap | Task detail freeform editor. Lightweight, extensible, headless |
| **Auth** | `{ Clerk of Auth0 — placeholder }` | Komt later. Passwordless email + code flow |
| **Backend** | `{ Convex of tRPC+Hono — placeholder }` | Komt later. Mock data voor nu |
| **Payments** | `{ Stripe — placeholder }` | Alleen jaarlijks pricing eerst (snelle validatie) |

### Waarom Radix direct en niet shadcn/ui?

Stage heeft een volledig eigen design system (lavender purple, specifieke radii, geen dark mode, SF Pro Display headings).
shadcn/ui zou meer customization kosten dan waarde opleveren. Radix geeft ons de accessible primitives
(Dialog, DropdownMenu, Tooltip, Toggle, Checkbox) zonder styling opinies. We stylen zelf met Tailwind.

### Waarom geen SSR/Next.js?

- Landing page is de enige SEO-route. Die is statische content — Google's JS renderer kan dit prima
- Alle app-routes zijn achter auth — geen SEO nodig
- De zoom-in/out transitions (het hart van de UX) vereisen volledige client-side controle
- Convex/backend subscriptions zijn client-side — SSR bespaart niets voor data
- Client portal: OG tags later via Cloudflare Worker header injection

---

## 2. Design System → Tailwind Mapping

### Kleuren (uit prototypes — deze zijn accurater dan de spec)

```css
@theme {
  /* Base */
  --color-bg: #FFFFFF;
  --color-bg-subtle: #FAFAF9;
  --color-surface: #FFFFFF;
  --color-text-primary: #1A1A2E;
  --color-text-secondary: #8C8C8C;
  --color-text-tertiary: #BFBFBF;
  --color-border: #E8E8E8;
  --color-border-subtle: #F0F0F0;
  --color-input-bg: #F5F5F5;

  /* Accent */
  --color-accent: #8782F5;           /* Prototypes gebruiken deze, niet spec's #9B8FD6 */
  --color-accent-hover: #7670E0;
  --color-accent-light: #EEEDFE;
  --color-accent-cyan: #3BAFDA;

  /* Functional */
  --color-success: #6BC9A0;
  --color-destructive: #E07070;
  --color-warning: #E5A84B;

  /* Portal (apart accent voor client-facing) */
  --color-portal-accent: #E8734A;
  --color-portal-accent-hover: #D4623B;
  --color-portal-accent-light: rgba(232, 115, 74, 0.08);
}
```

### Typografie

```css
@theme {
  --font-heading: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", sans-serif;
  --font-body: "DM Sans", -apple-system, BlinkMacSystemFont, sans-serif;
}
```

| Rol | Font | Weight | Size | Tailwind class |
|-----|------|--------|------|----------------|
| Page title / Hero | SF Pro Display | 600 (Semibold) | 28-32px | `font-heading text-[28px] font-semibold` |
| Section heading | SF Pro Display | 500-600 | 20-24px | `font-heading text-xl font-medium` |
| Modal heading | SF Pro Display | 500 | 20-22px | `font-heading text-xl font-medium` |
| Body text | DM Sans | 400 | 15-16px | `text-[15px]` |
| Button label | DM Sans | 500 | 15-16px | `font-medium text-[15px]` |
| Secondary text | DM Sans | 400 | 13-14px | `text-[13px] text-text-secondary` |
| Small label | DM Sans | 400 | 12-13px | `text-xs text-text-secondary` |

### Spacing

8px grid. Tailwind's default spacing schaal werkt: `p-2` = 8px, `p-4` = 16px, `p-6` = 24px, etc.
Page margins: `px-14` (56px) op desktop.

### Radii

- Buttons: `rounded-[10px]`
- Cards: `rounded-xl` (12px)
- Modals: `rounded-2xl` (16px)
- Inputs: `rounded-lg` (8px) of `rounded-[10px]`
- Pills: `rounded-full`
- Checkboxes: `rounded` (4px)

### Shadows

Minimaal. Prototypes gebruiken:
- Cards: geen shadow, alleen border
- Dropdowns: `shadow-[0_4px_16px_rgba(26,26,46,0.08)]`
- Modals: geen shadow (overlay geeft contrast)
- Profile avatar: `shadow-[0_1px_3px_rgba(26,26,46,0.08)]`

---

## 3. Route Structuur

```
src/routes/
├── __root.tsx                                    → Helmet meta defaults, font loading
├── index.tsx                                     → / Landing page (public, SEO)
├── auth.tsx                                      → /auth Email + verificatie code
├── _app.tsx                                      → Auth guard layout (nav + outlet)
├── _app/
│   ├── dashboard.tsx                             → /dashboard Timeline hero
│   ├── project.$projectId.tsx                    → /project/:id Phase roadmap + checklist
│   ├── project.$projectId_.task.$taskId.tsx      → /project/:id/task/:id Freeform editor
│   ├── settings.tsx                              → /settings Profiel, billing, clients
│   └── new-project.tsx                           → /new-project Creation flow (full page, niet modal)
└── portal.$shareToken.tsx                        → /portal/:token Client portal (public, apart layout)
```

### Route transitions

| Van → Naar | Transitie | Implementatie |
|------------|-----------|---------------|
| Dashboard → Project | Zoom-in | `motion.div` met `scale` + `opacity` via `AnimatePresence` |
| Project → Task | Zoom-in | Zelfde pattern |
| Terug (elke richting) | Zoom-out | Reverse animatie |
| Modal open | Fade + scale | Purple overlay `opacity` + modal `scale(0.97→1)` |
| Modal close | Reverse fade | Smooth 200-300ms |

### Project Creation: Modal vs Full Page

De spec zegt "modal over dashboard". Maar vanuit UX en routing perspectief:
- Modal state gaat verloren bij page refresh
- Deep linking naar stap 3 van creation is niet mogelijk met modal
- De creation flow heeft 5 stappen — dat is veel voor een modal

**Beslissing:** Full-page flow op `/new-project` met stappen.
Voordelen: bookmarkable, refresh-safe, cleaner code.
De "modal feel" behouden we visueel: centered content, max-width 420px,
dezelfde styling als de prototypes.

---

## 4. Component Architectuur

### Shared Components (src/components/shared/)

| Component | Gebruikt op | Props |
|-----------|-------------|-------|
| `Navbar` | Alle app routes | `backLink?: { label, to }` |
| `ProfileDropdown` | Navbar | `user: User` |
| `Modal` | Share, delete confirm, paywall | `open, onClose, children` |
| `ConfirmDialog` | Delete project/account | `title, message, confirmText, destructive` |
| `Toast` | Overal | Via context/hook |
| `SkeletonLoader` | Alle loading states | `variant: 'text' \| 'card' \| 'timeline'` |
| `EmptyState` | Dashboard, checklist, clients | `title, subtitle, action?` |
| `ProgressBar` | Project header, phase blocks | `value: number, size: 'sm' \| 'md'` |

### UI Primitives (src/components/ui/)

| Component | Radix basis | Stage styling |
|-----------|-------------|---------------|
| `Button` | — | Primary (accent filled), Ghost (border), Destructive (red text) |
| `Input` | — | Subtle border, accent focus, F5F5F5 bg variant |
| `Checkbox` | `@radix-ui/react-checkbox` | Rounded-sm, accent fill, white check SVG |
| `Toggle` | `@radix-ui/react-toggle` | Track: gray→accent, thumb: white circle |
| `DropdownMenu` | `@radix-ui/react-dropdown-menu` | White bg, subtle shadow, 8px radius |
| `Dialog` | `@radix-ui/react-dialog` | Purple-tinted overlay, centered, 16px radius |
| `Tooltip` | `@radix-ui/react-tooltip` | Dark navy bg (#1A1A2E), white text |
| `Tabs` | `@radix-ui/react-tabs` | Voor settings sidebar/tabs |
| `ToggleGroup` | `@radix-ui/react-toggle-group` | Pills: rounded-full, accent active |

### Landing Page Components (src/components/landing/)

| Component | Beschrijving |
|-----------|-------------|
| `LandingNav` | Sticky nav met blur bg, logo, links, CTA |
| `HeroSection` | Title, subtitle, CTA buttons, dashboard mockup screenshot |
| `TrustStrip` | 3-kolom grid met iconen + korte tekst |
| `FeaturesGrid` | Bento-achtige grid met feature cards + mini mockups |
| `TestimonialsSection` | Social proof (belangrijk met 300K volgers) |
| `PricingSection` | Enkel jaarlijks plan (snelle validatie strategie) |
| `CTASection` | Finale call-to-action voor conversie |
| `LandingFooter` | Links, legal, social |

### Auth Components (src/components/auth/)

| Component | Beschrijving |
|-----------|-------------|
| `EmailInput` | Centered form, email field, continue button |
| `VerificationCode` | 6 individuele digit boxes, auto-advance, auto-submit |

### Dashboard Components (src/components/dashboard/)

| Component | Beschrijving |
|-----------|-------------|
| `ContextBar` | Greeting, stats, "+ New Project" button |
| `TimelineHero` | SVG curve, project dots, hover tracking |
| `ProjectDot` | Avatar op de curve, hover state, click navigeert |
| `TrackingLine` | Verticale lijn die cursor volgt |
| `TimelineTooltip` | Hover tooltip met datum, project naam, taken |
| `BentoGrid` | 2-kolom grid met project cards |
| `ProjectListCard` | Project in bento: avatar, naam, phase, progress |
| `ActivityCard` | Recente activiteit feed |
| `StatsRow` | Active projects, completion rate, etc. |

### Project Detail Components (src/components/project/)

| Component | Beschrijving |
|-----------|-------------|
| `ProjectHeader` | Naam, client, progress bar, share + more menu |
| `PhaseRoadmap` | Horizontale fase blokken met connectoren |
| `PhaseBlock` | Individuele fase: dot, naam, count. States: completed/active/upcoming |
| `Checklist` | Fase header + items lijst |
| `ChecklistItem` | Checkbox + titel + arrow. Toggle, inline edit, navigate |
| `AddTaskInput` | "Add a task..." inline input |
| `ShareModal` | Toggle, link copy, email invite |
| `ProjectMoreMenu` | Edit, pause, delete dropdown |

### Task Detail Components (src/components/task/)

| Component | Beschrijving |
|-----------|-------------|
| `TaskBreadcrumb` | "← Project Name · Phase Name" |
| `TaskHeader` | Checkbox + editable title |
| `ContentEditor` | Tiptap editor: basic formatting, headings, lists, links |
| `InlineImage` | Uploaded image in content flow |
| `FileCard` | Non-image file: icon, name, size, download |
| `AttachTrigger` | "+ Attach file" link onderaan |

### Project Creation Components (src/components/creation/)

| Component | Beschrijving |
|-----------|-------------|
| `StepIndicator` | Dots of progress line bovenaan |
| `NameClientStep` | Project naam + client naam inputs |
| `ProjectTypeStep` | 2-kolom pill grid (Branding, Web Design, etc.) |
| `AIManualStep` | Twee option cards (AI-Generated vs Manual) |
| `TimelineStep` | Start + end date pickers |
| `PhaseSelectionStep` | Drag-and-drop fase lijst met toggles |
| `RoadmapPreview` | Verticale roadmap met dots en lijnen |
| `GeneratingAnimation` | Pulserende dots + "Creating your roadmap..." |

### Settings Components (src/components/settings/)

| Component | Beschrijving |
|-----------|-------------|
| `SettingsSidebar` | Navigatie links: Profile, Plan, Clients, Portal, Account |
| `ProfileSection` | Avatar, naam, email, role pills |
| `PlanBillingSection` | Plan info, billing cycle, payment method, cancel |
| `ClientsSection` | Client lijst met edit/delete, empty state |
| `PortalSection` | Portal branding: logo upload, accent kleur picker |
| `AccountSection` | Delete account met "Type DELETE" confirmatie |

### Client Portal Components (src/components/portal/)

| Component | Beschrijving |
|-----------|-------------|
| `PortalNav` | Client logo (custom branding) |
| `PortalHeader` | Project naam, client naam |
| `PortalProgress` | Progress bar met percentage |
| `PortalPhaseRoadmap` | Zelfde als project maar read-only, oranje accent |
| `PortalChecklist` | Read-only checklist, geen interactie |
| `PortalFooter` | "Powered by Stage" link (gratis marketing) |

---

## 5. Data Model (TypeScript types — backend-agnostisch)

```typescript
// src/types/index.ts

type User = {
  id: string
  email: string
  name: string
  avatarUrl?: string
  role: 'freelancer' | 'studio' | 'in-house' | 'agency'
  plan: 'free' | 'pro'
  createdAt: number
}

type Project = {
  id: string
  userId: string
  name: string
  clientName: string
  clientAvatarUrl?: string
  type: ProjectType
  status: 'active' | 'paused' | 'completed'
  startDate: number       // timestamp
  endDate: number         // timestamp
  phases: Phase[]
  progress: number        // 0-100
  createdAt: number
  shareToken?: string     // voor client portal
}

type ProjectType =
  | 'branding' | 'web-design' | 'product-design' | 'app-design'
  | 'packaging' | 'motion-design' | 'illustration' | 'other'

type Phase = {
  id: string
  projectId: string
  name: string
  order: number
  status: 'completed' | 'active' | 'upcoming'
  tasks: Task[]
  progress: number        // 0-100 (berekend uit tasks)
}

type Task = {
  id: string
  phaseId: string
  title: string
  isCompleted: boolean
  content?: string        // HTML van rich text editor
  attachments: Attachment[]
  order: number
  createdAt: number
  updatedAt: number
}

type Attachment = {
  id: string
  type: 'image' | 'pdf' | 'document' | 'other'
  url: string
  fileName: string
  fileSize: number        // bytes
  mimeType: string
}

type Client = {
  id: string
  userId: string
  name: string
  projectCount: number
}

type PortalConfig = {
  projectId: string
  isEnabled: boolean
  shareToken: string
  shareUrl: string
  logoUrl?: string        // Custom client logo
  accentColor: string     // Default: #E8734A (oranje)
}
```

---

## 6. Mock Data Strategie

Één bestand `src/data/mock.ts` met realistische data die exact matcht met de prototypes:

- 5 projecten (Website Redesign, Brand Identity, Mobile App, Packaging, Motion Reel)
- Elke met 4-6 fases
- Elke fase met 3-8 taken
- Mix van completed/active/upcoming states
- Realistische client namen en avatars
- Task content met formatted text, images, file attachments

Mock data wordt gebruikt via een `src/lib/api.ts` abstraction layer:

```typescript
// src/lib/api.ts
// Placeholder — wordt later vervangen door Convex queries of tRPC calls

export async function getProjects(): Promise<Project[]> { /* mock */ }
export async function getProject(id: string): Promise<Project> { /* mock */ }
export async function getTask(id: string): Promise<Task> { /* mock */ }
export async function updateTask(id: string, data: Partial<Task>): Promise<Task> { /* mock */ }
// etc.
```

TanStack Query wraps deze functies:

```typescript
// src/hooks/useProjects.ts
export function useProjects() {
  return useQuery({ queryKey: ['projects'], queryFn: getProjects })
}
```

Wanneer backend klaar is: alleen `src/lib/api.ts` aanpassen.
Geen wijzigingen nodig in components of hooks.

---

## 7. SEO Strategie

### Landing page (/)

**In `index.html`:**
```html
<title>Stage — Project clarity for creative professionals</title>
<meta name="description" content="Track your creative projects with clarity. Stage gives designers and freelancers a calm, focused way to manage projects, share progress with clients, and stay on top of every phase.">
<meta property="og:title" content="Stage — Project clarity for creative professionals">
<meta property="og:description" content="...">
<meta property="og:image" content="/og-image.png">
<meta property="og:type" content="website">
<meta name="twitter:card" content="summary_large_image">
```

**Structured data (JSON-LD):**
```json
{
  "@type": "SoftwareApplication",
  "name": "Stage",
  "applicationCategory": "ProjectManagement",
  "operatingSystem": "Web"
}
```

**Semantic HTML:**
- `<header>` voor nav
- `<main>` voor content
- `<section>` per sectie met proper `<h1>`, `<h2>`, `<h3>` hiërarchie
- `<footer>` voor footer

### App routes (/dashboard, /project/*, etc.)

Geen SEO nodig — achter auth. `react-helmet-async` voor dynamische `<title>`:
- Dashboard: "Stage — Dashboard"
- Project: "Stage — Website Redesign"
- Task: "Stage — Define project goals"

### Client Portal (/portal/:token)

Belangrijk voor social sharing (designer deelt link met client).
Later: Cloudflare Worker injecteert OG tags op basis van project data.
Voor nu: default meta tags.

---

## 8. Performance Optimalisaties

| Techniek | Waar | Hoe |
|----------|------|-----|
| **Route code-splitting** | Alle routes | TanStack Router doet dit automatisch via file-based routing |
| **Lazy imports** | Tiptap editor, date pickers | `React.lazy()` + `Suspense` |
| **Prefetch on hover** | Dashboard → Project links | `router.preloadRoute()` on mouseEnter |
| **Skeleton loading** | Alle data-afhankelijke content | Custom skeleton componenten, shimmer animatie |
| **Optimistic updates** | Checkbox toggles, favoriting | TanStack Query `onMutate` + rollback |
| **Image lazy loading** | Task detail inline images | `loading="lazy"` + `Intersection Observer` |
| **Font loading** | DM Sans | `<link rel="preconnect">` + `font-display: swap` |
| **Animation perf** | Alle transitions | `transform` + `opacity` only (GPU-accelerated) |
| **Bundle analysis** | Build time | `rollup-plugin-visualizer` |

---

## 9. Build Fases (prioriteit volgorde)

### Fase 1: Foundation
- [ ] Project init (Vite, React, TypeScript)
- [ ] Tailwind CSS v4 met Stage design tokens
- [ ] TanStack Router setup (file-based)
- [ ] TanStack Query setup
- [ ] Cloudflare Worker + wrangler config
- [ ] `index.html` met SEO meta tags
- [ ] Font loading (DM Sans via Google Fonts, SF Pro Display system)
- [ ] Base UI components (Button, Input, Checkbox, Toggle)
- [ ] Utility functies (cn, formatDate, etc.)
- [ ] TypeScript types
- [ ] Mock data

### Fase 2: Layout & Navigation
- [ ] Root layout (`__root.tsx`)
- [ ] App layout (`_app.tsx`) met auth guard placeholder
- [ ] Navbar component
- [ ] Profile dropdown
- [ ] Mobile responsive shell

### Fase 3: Landing Page (SEO-kritiek, eerste indruk)
- [ ] Landing nav (sticky, blur)
- [ ] Hero section (headline, subtitle, CTAs, dashboard mockup)
- [ ] Trust strip (3 kolommen)
- [ ] Features grid (bento layout met mini mockups)
- [ ] Social proof section
- [ ] Pricing section (alleen jaarlijks)
- [ ] Final CTA
- [ ] Footer
- [ ] SEO: meta tags, structured data, semantic HTML
- [ ] Responsive (mobile-first voor landing)

### Fase 4: Auth Flow
- [ ] Auth page layout (centered, no nav)
- [ ] Email input screen
- [ ] Verification code screen (6 digit boxes)
- [ ] Auto-advance, auto-submit, paste support
- [ ] Error states, loading states
- [ ] Routing logic placeholder (new user → onboarding, existing → dashboard)

### Fase 5: Dashboard (de hero experience)
- [ ] Context bar (greeting, stats, new project button)
- [ ] Timeline hero met SVG curve
- [ ] Project dots op de curve (positioned, animated)
- [ ] Hover tracking (verticale lijn, cursor volgen)
- [ ] Timeline tooltip (fase, taken, completion)
- [ ] Background fade bij hover
- [ ] Bento grid (project cards, activity, payments)
- [ ] Empty state
- [ ] Skeleton loading state
- [ ] Click → navigeer naar project (zoom-in transition)

### Fase 6: Project Detail
- [ ] Zoom-in entry transition
- [ ] Project header (naam, client, progress, share, more menu)
- [ ] Phase roadmap hero (horizontale blokken + connectoren)
- [ ] Phase states (completed/active/upcoming met animatie)
- [ ] Checklist sectie
- [ ] Checklist items (checkbox, title, arrow)
- [ ] Add task input
- [ ] Checkbox toggle → progress update cascade
- [ ] Share modal
- [ ] More menu dropdown (edit, pause, delete)
- [ ] Delete confirmation dialog
- [ ] Phase click → checklist update
- [ ] Empty phase state
- [ ] Bottom dock (project switcher)

### Fase 7: Task Detail
- [ ] Zoom-in entry transition
- [ ] Breadcrumb navigation
- [ ] Task header (checkbox + editable title)
- [ ] Tiptap rich text editor setup
- [ ] Basic formatting (bold, italic, headings, lists, links)
- [ ] Floating toolbar bij text selectie
- [ ] File upload UI (drag & drop zone)
- [ ] Inline image display
- [ ] File card display
- [ ] Auto-save indicator ("Saved")
- [ ] Empty state placeholder

### Fase 8: Project Creation Flow
- [ ] Full-page centered layout
- [ ] Step indicator (dots)
- [ ] Step 1: Project naam + client
- [ ] Step 2: Project type pills
- [ ] Step 3: AI vs Manual choice
- [ ] Step 4A: Timeline (dates) → generate animation
- [ ] Step 4M: Phase selection (drag & drop toggles)
- [ ] Step 5: Roadmap preview
- [ ] Step transitions (fade/slide)
- [ ] Form validation
- [ ] Back navigation met data preservation

### Fase 9: Settings
- [ ] Settings layout (sidebar + content)
- [ ] Profile section (avatar, naam, email, role)
- [ ] Plan & Billing section
- [ ] Clients management section
- [ ] Portal branding section (logo upload, accent kleur)
- [ ] Account section (delete met confirmatie)
- [ ] Auto-save pattern
- [ ] Tab navigation (URL-based)

### Fase 10: Client Portal
- [ ] Apart layout (geen app nav)
- [ ] Custom branding (logo, accent kleur)
- [ ] Project header + progress
- [ ] Phase roadmap (read-only, oranje accent)
- [ ] Checklist (read-only)
- [ ] "Powered by Stage" footer
- [ ] Preview banner (wanneer bekeken vanuit settings)
- [ ] Mobile responsive (clients bekijken op telefoon)

---

## 10. Integratie Punten

Alle plekken waar auth/backend later ingeplugd wordt:

### Auth (`src/lib/auth.ts`)

```typescript
// PLACEHOLDER — wordt Clerk of Auth0
export async function getCurrentUser(): Promise<User | null> { /* mock user */ }
export async function signIn(email: string): Promise<void> { /* no-op */ }
export async function verifyCode(code: string): Promise<{ isNewUser: boolean }> { /* mock */ }
export async function signOut(): Promise<void> { /* no-op */ }
export function useAuth(): { user: User | null; isLoading: boolean } { /* mock */ }
```

### Data (`src/lib/api.ts`)

```typescript
// PLACEHOLDER — wordt Convex queries/mutations of tRPC calls
export async function getProjects(): Promise<Project[]> { /* mock */ }
export async function getProject(id: string): Promise<Project> { /* mock */ }
export async function createProject(data: CreateProjectInput): Promise<Project> { /* mock */ }
export async function updateProject(id: string, data: Partial<Project>): Promise<Project> { /* mock */ }
export async function deleteProject(id: string): Promise<void> { /* mock */ }
export async function getTask(id: string): Promise<Task> { /* mock */ }
export async function updateTask(id: string, data: Partial<Task>): Promise<Task> { /* mock */ }
export async function toggleTaskComplete(id: string): Promise<Task> { /* mock */ }
export async function uploadFile(file: File): Promise<Attachment> { /* mock */ }
export async function getPortalData(shareToken: string): Promise<PortalData> { /* mock */ }
// etc.
```

### Payments (`src/lib/payments.ts`)

```typescript
// PLACEHOLDER — wordt Stripe
export async function createCheckoutSession(plan: 'yearly'): Promise<string> { /* mock URL */ }
export async function getSubscription(): Promise<Subscription | null> { /* mock */ }
export async function cancelSubscription(): Promise<void> { /* no-op */ }
```

---

## 11. Conversie & Psychologie Notities

### Landing page

- **Headline moet pijn benoemen:** "Stop losing track of your creative projects" > "Project management tool"
- **Social proof prominent:** "Join 500+ designers who..." (of het werkelijke getal zodra beschikbaar)
- **Enkel jaarlijks plan** → lagere churn, snellere validatie van betalingsbereidheid
- **"Limited early access" framing** → urgentie, exclusiviteit
- **Dashboard screenshot als hero visual** → toon het product, geen abstracte illustraties

### Onboarding

- **Progress indicator** (stap X van Y) → loss aversion, mensen willen afmaken
- **AI-generated roadmap** als default → lage drempel, instant waarde
- **Eerste project ontstaat IN de onboarding** → gebruiker heeft direct iets om naar te kijken

### Retention

- **Timeline als "home"** → elke keer als je de app opent zie je overzicht
- **Progress feedback loop** → checkbox → progress bar update → percentage → dopamine
- **Client portal delen** → sociale commitment, moeilijker om te stoppen als klant meekijkt
- **"Powered by Stage"** in portal → viraal loop: klant ziet → wordt nieuwsgierig → wordt gebruiker

### Paywall

- **Niet blokkerend in v1** → laat mensen het product ervaren
- **Project limiet op free plan** → trigger om te upgraden wanneer ze waarde zien
- **Upgrade prompt op natuurlijke momenten** → "Share with client" (locked), 4e project aanmaken

---

## 12. Verbetersuggesties t.o.v. de Specs

| Verbetering | Waarom | Impact |
|-------------|--------|--------|
| **"Powered by Stage" link in portal footer** | Gratis marketing bij elke client share | Hoog — virale loop |
| **Onboarding progress indicator** | Loss aversion, hogere completion rate | Hoog — retention |
| **Keyboard shortcuts** | Designers verwachten dit (Cmd+K search, etc.) | Medium — power users |
| **"Invite to Stage" in client portal** | Client → designer pipeline | Medium — growth |
| **Email digest** | Wekelijks overzicht van project progress | Medium — re-engagement |
| **Subtle "Today" marker op timeline** | Spec noemt het maar prototypes missen het | Low — polish |
| **Scroll-to-active-phase** | Bij laden project detail, scroll naar actieve fase | Low — UX |
| **Drag handles pas zichtbaar op hover** | Cleaner default state voor checklist | Low — polish |

---

## 13. Risico's & Mitigatie

| Risico | Impact | Mitigatie |
|--------|--------|-----------|
| **SF Pro Display niet beschikbaar op Windows/Android** | Headings zien er anders uit | Fallback naar system font is acceptabel — doelgroep is designers op Mac |
| **Timeline SVG performance bij veel projecten** | Lag bij 20+ projecten | Virtualisatie + canvas fallback als nodig |
| **Tiptap bundle size** | +200kb voor editor | Lazy load alleen op task detail route |
| **Auth integratie later** | Refactoring risico | Abstractie laag (`src/lib/auth.ts`) houdt impact minimaal |
| **Backend keuze later** | Data model changes | TypeScript types + mock data als contract — backend moet deze types respecteren |
| **Deadline 10 maart** | Strakke planning nodig | Alles wordt gebouwd — fases 1-10 worden sequentieel afgewerkt |
