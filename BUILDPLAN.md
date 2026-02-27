# Stage - Build Plan

Working document. Everything needed to build Stage from specs to production.

---

## 0. Product & Vision

### What is Stage?

Stage is a SaaS project management tool built specifically for **creative professionals** - freelance designers, design studios, in-house design teams, and agencies. It is not a generic PM tool. It is built for people running client projects with clear phases (Strategy -> Research -> Design -> Development -> Launch) and who want clients to follow along in a premium way.

### The core problem

Designers and freelancers use tools that were not built for them. Asana, Monday, Notion - they are too complex, too busy, too enterprise. Or they use nothing at all and send screenshots and spreadsheets to clients. The result:

- **No overview:** "Where am I across all my projects?" is a question nobody can answer quickly
- **Poor client communication:** Clients constantly ask "how is it going?" because there is no shared view
- **No structure:** Phases, tasks, and deadlines live in the designer's head or are scattered across tools

### The solution

Stage gives creative professionals **one calm home** for all project work:

1. **Dashboard with timeline** - One glance at all projects over time. Inspired by Visitors.now: a horizontal curve with project avatars, hover for details. This is the heart of Stage. It answers immediately: "where am I?"
2. **Project phases & checklist** - Each project has phases (Strategy, Design, Development, etc.) with tasks per phase. Check things off -> see project progress. The feedback loop (check off -> progress bar grows -> percentage rises) is intentionally addictive.
3. **Client portal** - With one click you share a read-only project view with your client. The client sees phases, tasks, and progress - without being able to edit anything. Premium look and feel. "Powered by Stage" in the footer = viral growth.
4. **AI-generated roadmaps** - Choose your project type, Stage generates a roadmap with phases and tasks. Instant value, low friction.

### Who is it for?

| Segment | Description | Pain |
|---------|-------------|------|
| **Freelance designers** | Solo, 3-8 client projects at once | No overview, clients constantly ask for updates |
| **Design studios** | Small team (2-10), 10-20 projects | Projects overlap, onboarding new projects is chaotic |
| **In-house designers** | Working inside a company, multiple stakeholders | Need to communicate progress to non-designers |
| **Agencies** | Larger teams, many client projects | Client-facing communication is a bottleneck |

The primary launch audience is **freelance designers and small studios**. These are people who:
- Work on Mac (important for SF Pro Display font)
- Are visually driven (design must feel premium)
- Are willing to pay if it makes their work simpler
- Are active on Instagram and TikTok (where our client has 300K followers)

### Business model

- **Free tier:** Limited number of projects (e.g. 2-3), no client portal
- **Pro plan (EUR XX/year):** Unlimited projects, client portal, AI roadmaps
- **Annual only at first** - fast willingness-to-pay validation, lower churn
- **Paywall is non-blocking** - users experience value first, then see upgrade prompts at natural moments (creating 4th project, "Share with client")

### Design philosophy

Stage should feel like:
- **Visitors.now** in clarity - data-driven but clean
- **Apple** in calmness - lots of whitespace, minimal color, room to breathe
- **Linear** in precision - subtle, thoughtful, no unnecessary elements

Stage should NOT feel like:
- A productivity tool with badges and notifications everywhere
- A startup dashboard full of charts
- Enterprise PM software with sidebars and filters

**Light mode only.** No dark mode in v1. One accent color: lavender purple (`#8782F5`). Used sparingly. White and off-white should dominate every screen.

### The three levels

```
Level 1: Dashboard      -> macro overview of all projects over time
Level 2: Project Detail -> mid-level: phases and checklist for one project
Level 3: Task Detail    -> micro-level: notes and files for one task
```

Each level deeper = zoom-in transition. Going back = zoom-out. The user always knows where they are.

### Navigation flow

```
Landing Page (/) -> Auth (/auth) -> Onboarding -> Dashboard (/dashboard)
                                                     ↓
                                              Project Detail (/project/:id)
                                                     ↓
                                              Task Detail (/project/:id/task/:id)

Dashboard -> New Project (/new-project)
Dashboard -> Settings (/settings)
Project Detail -> Share -> Client Portal (/portal/:token) [separate, public]
```

### Conversion strategy

This product is launched by a designer with **300K followers** on Instagram and TikTok. The launch strategy:

1. **Landing page** with "early access" framing -> email capture
2. **Annual plan only** -> fast revenue validation
3. **Onboarding creates first project immediately** -> instant value
4. **Client portal "Powered by Stage"** -> designer shares portal with client -> client sees Stage -> becomes a user
5. **Progress feedback loop** -> check task -> see project move forward -> dopamine -> return behavior

### What is already ready (specs & prototypes)

The client (designer) has **prepared everything**:

| File | Content |
|---------|--------|
| `00-design-system.md` | Full design tokens: colors, typography, spacing, components, animations |
| `01-auth-flow.md` | Email input + 6-digit verification code, routing logic |
| `03-dashboard.md` | Timeline hero, project blocks, hover interaction, tooltips, empty states |
| `04-project-detail.md` | Phase roadmap, checklist, progress feedback, share modal |
| `05-task-detail.md` | Freeform content, text editing, file uploads, auto-save |
| `06-project-creation-modal.md` | Multi-step flow: name, type, AI/manual, timeline, preview |
| `08-settings.md` | Profile, plan & billing, clients, account deletion |
| 8 HTML prototypes | Pixel-perfect interactive prototypes of every screen |
| Design reference images | Visitors.now dashboard, timeline curve, graph states |

This is an exceptionally complete starting point. Every state, every interaction, every edge case is documented. The prototypes show exactly how it should look.

---

## 1. Stack Decisions

| Layer | Choice | Why |
|------|-------|--------|
| **Runtime** | Cloudflare Workers | Edge deployment, SPA fallback, ~0ms cold start |
| **Frontend** | React 19 | SPA - everything behind auth except landing + portal |
| **Routing** | TanStack Router (file-based) | Type-safe params, `beforeLoad` auth guards, auto code-splitting |
| **Server State** | TanStack Query v5 | Caching, invalidation, optimistic updates. Mock data now, backend later |
| **CSS** | Tailwind CSS v4 (Vite plugin) | CSS-native theming, `@theme` directive for Stage design tokens |
| **UI Primitives** | Radix UI (direct, no shadcn) | Accessible dropdowns/modals/tooltips. Stage design is too custom for shadcn defaults |
| **Animations** | Motion (Framer Motion v12) | Zoom transitions (Dashboard->Project->Task), modal animations, progress bars |
| **Icons** | Phosphor Icons (light weight) | Spec says "thin line icons, 1.5-2px stroke". Phosphor light matches perfectly |
| **Fonts** | SF Pro Display (system) + DM Sans (Google Fonts) | Headings: `-apple-system, 'SF Pro Display'`. Body: `'DM Sans'` |
| **Build** | Vite 6 | Fast HMR, native Cloudflare plugin support |
| **Rich Text** | Tiptap | Task detail freeform editor. Lightweight, extensible, headless |
| **Auth** | `{ Clerk or Auth0 - placeholder }` | Added later. Passwordless email + code flow |
| **Backend** | `{ Convex or tRPC+Hono - placeholder }` | Added later. Mock data for now |
| **Payments** | `{ Stripe - placeholder }` | Annual pricing only at first (fast validation) |

### Why Radix directly and not shadcn/ui?

Stage has a fully custom design system (lavender purple, specific radii, no dark mode, SF Pro Display headings).
shadcn/ui would cost more customization effort than value. Radix gives us accessible primitives
(Dialog, DropdownMenu, Tooltip, Toggle, Checkbox) with no styling opinions. We style everything ourselves with Tailwind.

### Why no SSR/Next.js?

- Landing page is the only SEO route. It is static content - Google's JS renderer can handle this
- All app routes are behind auth - no SEO needed
- The zoom-in/out transitions (the core UX) require full client-side control
- Convex/backend subscriptions are client-side - SSR adds no data benefit
- Client portal: OG tags later via Cloudflare Worker header injection

---

## 2. Design System -> Tailwind Mapping

### Colors (from prototypes - these are more accurate than the spec)

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
  --color-accent: #8782F5;           /* Prototypes use this, not spec's #9B8FD6 */
  --color-accent-hover: #7670E0;
  --color-accent-light: #EEEDFE;
  --color-accent-cyan: #3BAFDA;

  /* Functional */
  --color-success: #6BC9A0;
  --color-destructive: #E07070;
  --color-warning: #E5A84B;

  /* Portal (separate accent for client-facing) */
  --color-portal-accent: #E8734A;
  --color-portal-accent-hover: #D4623B;
  --color-portal-accent-light: rgba(232, 115, 74, 0.08);
}
```

### Typography

```css
@theme {
  --font-heading: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", sans-serif;
  --font-body: "DM Sans", -apple-system, BlinkMacSystemFont, sans-serif;
}
```

| Role | Font | Weight | Size | Tailwind class |
|-----|------|--------|------|----------------|
| Page title / Hero | SF Pro Display | 600 (Semibold) | 28-32px | `font-heading text-[28px] font-semibold` |
| Section heading | SF Pro Display | 500-600 | 20-24px | `font-heading text-xl font-medium` |
| Modal heading | SF Pro Display | 500 | 20-22px | `font-heading text-xl font-medium` |
| Body text | DM Sans | 400 | 15-16px | `text-[15px]` |
| Button label | DM Sans | 500 | 15-16px | `font-medium text-[15px]` |
| Secondary text | DM Sans | 400 | 13-14px | `text-[13px] text-text-secondary` |
| Small label | DM Sans | 400 | 12-13px | `text-xs text-text-secondary` |

### Spacing

8px grid. Tailwind's default spacing scale works: `p-2` = 8px, `p-4` = 16px, `p-6` = 24px, etc.
Page margins: `px-14` (56px) on desktop.

### Radii

- Buttons: `rounded-[10px]`
- Cards: `rounded-xl` (12px)
- Modals: `rounded-2xl` (16px)
- Inputs: `rounded-lg` (8px) or `rounded-[10px]`
- Pills: `rounded-full`
- Checkboxes: `rounded` (4px)

### Shadows

Minimal. Prototypes use:
- Cards: no shadow, border only
- Dropdowns: `shadow-[0_4px_16px_rgba(26,26,46,0.08)]`
- Modals: no shadow (overlay gives contrast)
- Profile avatar: `shadow-[0_1px_3px_rgba(26,26,46,0.08)]`

---

## 3. Route Structure

```
src/routes/
├── __root.tsx                                    -> Helmet meta defaults, font loading
├── index.tsx                                     -> / Landing page (public, SEO)
├── auth.tsx                                      -> /auth Email + verification code
├── _app.tsx                                      -> Auth guard layout (nav + outlet)
├── _app/
│   ├── dashboard.tsx                             -> /dashboard Timeline hero
│   ├── project.$projectId.tsx                    -> /project/:id Phase roadmap + checklist
│   ├── project.$projectId_.task.$taskId.tsx      -> /project/:id/task/:id Freeform editor
│   ├── settings.tsx                              -> /settings Profile, billing, clients
│   └── new-project.tsx                           -> /new-project Creation flow (full page, not modal)
└── portal.$shareToken.tsx                        -> /portal/:token Client portal (public, separate layout)
```

### Route transitions

| From -> To | Transition | Implementation |
|------------|-----------|---------------|
| Dashboard -> Project | Zoom-in | `motion.div` with `scale` + `opacity` via `AnimatePresence` |
| Project -> Task | Zoom-in | Same pattern |
| Back (any direction) | Zoom-out | Reverse animation |
| Modal open | Fade + scale | Purple overlay `opacity` + modal `scale(0.97->1)` |
| Modal close | Reverse fade | Smooth 200-300ms |

### Project Creation: Modal vs Full Page

The spec says "modal over dashboard". But from a UX and routing perspective:
- Modal state is lost on page refresh
- Deep linking to step 3 of creation is not possible with a modal
- The creation flow has 5 steps - that is a lot for a modal

**Decision:** Full-page flow on `/new-project` with steps.
Benefits: bookmarkable, refresh-safe, cleaner code.
We keep the "modal feel" visually: centered content, max-width 420px,
same styling as the prototypes.

---

## 4. Component Architecture

### Shared Components (`src/components/shared/`)

| Component | Used on | Props |
|-----------|-------------|-------|
| `Navbar` | All app routes | `backLink?: { label, to }` |
| `ProfileDropdown` | Navbar | `user: User` |
| `Modal` | Share, delete confirm, paywall | `open, onClose, children` |
| `ConfirmDialog` | Delete project/account | `title, message, confirmText, destructive` |
| `Toast` | Everywhere | Via context/hook |
| `SkeletonLoader` | All loading states | `variant: 'text' \| 'card' \| 'timeline'` |
| `EmptyState` | Dashboard, checklist, clients | `title, subtitle, action?` |
| `ProgressBar` | Project header, phase blocks | `value: number, size: 'sm' \| 'md'` |

### UI Primitives (`src/components/ui/`)

| Component | Radix base | Stage styling |
|-----------|-------------|---------------|
| `Button` | - | Primary (accent filled), Ghost (border), Destructive (red text) |
| `Input` | - | Subtle border, accent focus, F5F5F5 bg variant |
| `Checkbox` | `@radix-ui/react-checkbox` | Rounded-sm, accent fill, white check SVG |
| `Toggle` | `@radix-ui/react-toggle` | Track: gray->accent, thumb: white circle |
| `DropdownMenu` | `@radix-ui/react-dropdown-menu` | White bg, subtle shadow, 8px radius |
| `Dialog` | `@radix-ui/react-dialog` | Purple-tinted overlay, centered, 16px radius |
| `Tooltip` | `@radix-ui/react-tooltip` | Dark navy bg (`#1A1A2E`), white text |
| `Tabs` | `@radix-ui/react-tabs` | For settings sidebar/tabs |
| `ToggleGroup` | `@radix-ui/react-toggle-group` | Pills: rounded-full, accent active |

### Landing Page Components (`src/components/landing/`)

| Component | Description |
|-----------|-------------|
| `LandingNav` | Sticky nav with blur bg, logo, links, CTA |
| `HeroSection` | Title, subtitle, CTA buttons, dashboard mockup screenshot |
| `TrustStrip` | 3-column grid with icons + short text |
| `FeaturesGrid` | Bento-style grid with feature cards + mini mockups |
| `TestimonialsSection` | Social proof (important with 300K followers) |
| `PricingSection` | Annual plan only (fast validation strategy) |
| `CTASection` | Final conversion call-to-action |
| `LandingFooter` | Links, legal, social |

### Auth Components (`src/components/auth/`)

| Component | Description |
|-----------|-------------|
| `EmailInput` | Centered form, email field, continue button |
| `VerificationCode` | 6 individual digit boxes, auto-advance, auto-submit |

### Dashboard Components (`src/components/dashboard/`)

| Component | Description |
|-----------|-------------|
| `ContextBar` | Greeting, stats, "+ New Project" button |
| `TimelineHero` | SVG curve, project dots, hover tracking |
| `ProjectDot` | Avatar on the curve, hover state, click navigates |
| `TrackingLine` | Vertical line following cursor |
| `TimelineTooltip` | Hover tooltip with date, project name, tasks |
| `BentoGrid` | 2-column grid with project cards |
| `ProjectListCard` | Project in bento: avatar, name, phase, progress |
| `ActivityCard` | Recent activity feed |
| `StatsRow` | Active projects, completion rate, etc. |

### Project Detail Components (`src/components/project/`)

| Component | Description |
|-----------|-------------|
| `ProjectHeader` | Name, client, progress bar, share + more menu |
| `PhaseRoadmap` | Horizontal phase blocks with connectors |
| `PhaseBlock` | Individual phase: dot, name, count. States: completed/active/upcoming |
| `Checklist` | Phase header + item list |
| `ChecklistItem` | Checkbox + title + arrow. Toggle, inline edit, navigate |
| `AddTaskInput` | "Add a task..." inline input |
| `ShareModal` | Toggle, link copy, email invite |
| `ProjectMoreMenu` | Edit, pause, delete dropdown |

### Task Detail Components (`src/components/task/`)

| Component | Description |
|-----------|-------------|
| `TaskBreadcrumb` | "<- Project Name - Phase Name" |
| `TaskHeader` | Checkbox + editable title |
| `ContentEditor` | Tiptap editor: basic formatting, headings, lists, links |
| `InlineImage` | Uploaded image in content flow |
| `FileCard` | Non-image file: icon, name, size, download |
| `AttachTrigger` | "+ Attach file" link at bottom |

### Project Creation Components (`src/components/creation/`)

| Component | Description |
|-----------|-------------|
| `StepIndicator` | Dots or progress line at top |
| `NameClientStep` | Project name + client name inputs |
| `ProjectTypeStep` | 2-column pill grid (Branding, Web Design, etc.) |
| `AIManualStep` | Two option cards (AI-Generated vs Manual) |
| `TimelineStep` | Start + end date pickers |
| `PhaseSelectionStep` | Drag-and-drop phase list with toggles |
| `RoadmapPreview` | Vertical roadmap with dots and lines |
| `GeneratingAnimation` | Pulsing dots + "Creating your roadmap..." |

### Settings Components (`src/components/settings/`)

| Component | Description |
|-----------|-------------|
| `SettingsSidebar` | Navigation links: Profile, Plan, Clients, Portal, Account |
| `ProfileSection` | Avatar, name, email, role pills |
| `PlanBillingSection` | Plan info, billing cycle, payment method, cancel |
| `ClientsSection` | Client list with edit/delete, empty state |
| `PortalSection` | Portal branding: logo upload, accent color picker |
| `AccountSection` | Delete account with "Type DELETE" confirmation |

### Client Portal Components (`src/components/portal/`)

| Component | Description |
|-----------|-------------|
| `PortalNav` | Client logo (custom branding) |
| `PortalHeader` | Project name, client name |
| `PortalProgress` | Progress bar with percentage |
| `PortalPhaseRoadmap` | Same as project but read-only, orange accent |
| `PortalChecklist` | Read-only checklist, no interaction |
| `PortalFooter` | "Powered by Stage" link (free marketing) |

---

## 5. Data Model (TypeScript types - backend-agnostic)

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
  shareToken?: string     // for client portal
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
  progress: number        // 0-100 (calculated from tasks)
}

type Task = {
  id: string
  phaseId: string
  title: string
  isCompleted: boolean
  content?: string        // HTML from rich text editor
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
  accentColor: string     // Default: #E8734A (orange)
}
```

---

## 6. Mock Data Strategy

One file `src/data/mock.ts` with realistic data that exactly matches the prototypes:

- 5 projects (Website Redesign, Brand Identity, Mobile App, Packaging, Motion Reel)
- Each with 4-6 phases
- Each phase with 3-8 tasks
- Mix of completed/active/upcoming states
- Realistic client names and avatars
- Task content with formatted text, images, file attachments

Mock data is used through a `src/lib/api.ts` abstraction layer:

```typescript
// src/lib/api.ts
// Placeholder - will later be replaced by Convex queries or tRPC calls

export async function getProjects(): Promise<Project[]> { /* mock */ }
export async function getProject(id: string): Promise<Project> { /* mock */ }
export async function getTask(id: string): Promise<Task> { /* mock */ }
export async function updateTask(id: string, data: Partial<Task>): Promise<Task> { /* mock */ }
// etc.
```

TanStack Query wraps these functions:

```typescript
// src/hooks/useProjects.ts
export function useProjects() {
  return useQuery({ queryKey: ['projects'], queryFn: getProjects })
}
```

When backend is ready: only update `src/lib/api.ts`.
No changes needed in components or hooks.

---

## 7. SEO Strategy

### Landing page (`/`)

**In `index.html`:**
```html
<title>Stage - Project clarity for creative professionals</title>
<meta name="description" content="Track your creative projects with clarity. Stage gives designers and freelancers a calm, focused way to manage projects, share progress with clients, and stay on top of every phase.">
<meta property="og:title" content="Stage - Project clarity for creative professionals">
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
- `<header>` for nav
- `<main>` for content
- `<section>` per section with proper `<h1>`, `<h2>`, `<h3>` hierarchy
- `<footer>` for footer

### App routes (`/dashboard`, `/project/*`, etc.)

No SEO needed - behind auth. `react-helmet-async` for dynamic `<title>`:
- Dashboard: "Stage - Dashboard"
- Project: "Stage - Website Redesign"
- Task: "Stage - Define project goals"

### Client Portal (`/portal/:token`)

Important for social sharing (designer shares link with client).
Later: Cloudflare Worker injects OG tags based on project data.
For now: default meta tags.

---

## 8. Performance Optimizations

| Technique | Where | How |
|----------|------|-----|
| **Route code-splitting** | All routes | TanStack Router does this automatically via file-based routing |
| **Lazy imports** | Tiptap editor, date pickers | `React.lazy()` + `Suspense` |
| **Prefetch on hover** | Dashboard -> Project links | `router.preloadRoute()` on mouseEnter |
| **Skeleton loading** | All data-dependent content | Custom skeleton components, shimmer animation |
| **Optimistic updates** | Checkbox toggles, favoriting | TanStack Query `onMutate` + rollback |
| **Image lazy loading** | Task detail inline images | `loading="lazy"` + `Intersection Observer` |
| **Font loading** | DM Sans | `<link rel="preconnect">` + `font-display: swap` |
| **Animation perf** | All transitions | `transform` + `opacity` only (GPU-accelerated) |
| **Bundle analysis** | Build time | `rollup-plugin-visualizer` |

---

## 9. Build Phases (priority order)

### Phase 1: Foundation
- [ ] Project init (Vite, React, TypeScript)
- [ ] Tailwind CSS v4 with Stage design tokens
- [ ] TanStack Router setup (file-based)
- [ ] TanStack Query setup
- [ ] Cloudflare Worker + wrangler config
- [ ] `index.html` with SEO meta tags
- [ ] Font loading (DM Sans via Google Fonts, SF Pro Display system)
- [ ] Base UI components (Button, Input, Checkbox, Toggle)
- [ ] Utility functions (`cn`, `formatDate`, etc.)
- [ ] TypeScript types
- [ ] Mock data

### Phase 2: Layout & Navigation
- [ ] Root layout (`__root.tsx`)
- [ ] App layout (`_app.tsx`) with auth guard placeholder
- [ ] Navbar component
- [ ] Profile dropdown
- [ ] Mobile responsive shell

### Phase 3: Landing Page (SEO-critical, first impression)
- [ ] Landing nav (sticky, blur)
- [ ] Hero section (headline, subtitle, CTAs, dashboard mockup)
- [ ] Trust strip (3 columns)
- [ ] Features grid (bento layout with mini mockups)
- [ ] Social proof section
- [ ] Pricing section (annual only)
- [ ] Final CTA
- [ ] Footer
- [ ] SEO: meta tags, structured data, semantic HTML
- [ ] Responsive (mobile-first for landing)

### Phase 4: Auth Flow
- [ ] Auth page layout (centered, no nav)
- [ ] Email input screen
- [ ] Verification code screen (6 digit boxes)
- [ ] Auto-advance, auto-submit, paste support
- [ ] Error states, loading states
- [ ] Routing logic placeholder (new user -> onboarding, existing -> dashboard)

### Phase 5: Dashboard (the hero experience)
- [ ] Context bar (greeting, stats, new project button)
- [ ] Timeline hero with SVG curve
- [ ] Project dots on curve (positioned, animated)
- [ ] Hover tracking (vertical line, cursor follow)
- [ ] Timeline tooltip (phase, tasks, completion)
- [ ] Background fade on hover
- [ ] Bento grid (project cards, activity, payments)
- [ ] Empty state
- [ ] Skeleton loading state
- [ ] Click -> navigate to project (zoom-in transition)

### Phase 6: Project Detail
- [ ] Zoom-in entry transition
- [ ] Project header (name, client, progress, share, more menu)
- [ ] Phase roadmap hero (horizontal blocks + connectors)
- [ ] Phase states (completed/active/upcoming with animation)
- [ ] Checklist section
- [ ] Checklist items (checkbox, title, arrow)
- [ ] Add task input
- [ ] Checkbox toggle -> progress update cascade
- [ ] Share modal
- [ ] More menu dropdown (edit, pause, delete)
- [ ] Delete confirmation dialog
- [ ] Phase click -> checklist update
- [ ] Empty phase state
- [ ] Bottom dock (project switcher)

### Phase 7: Task Detail
- [ ] Zoom-in entry transition
- [ ] Breadcrumb navigation
- [ ] Task header (checkbox + editable title)
- [ ] Tiptap rich text editor setup
- [ ] Basic formatting (bold, italic, headings, lists, links)
- [ ] Floating toolbar on text selection
- [ ] File upload UI (drag & drop zone)
- [ ] Inline image display
- [ ] File card display
- [ ] Auto-save indicator ("Saved")
- [ ] Empty state placeholder

### Phase 8: Project Creation Flow
- [ ] Full-page centered layout
- [ ] Step indicator (dots)
- [ ] Step 1: Project name + client
- [ ] Step 2: Project type pills
- [ ] Step 3: AI vs Manual choice
- [ ] Step 4A: Timeline (dates) -> generate animation
- [ ] Step 4M: Phase selection (drag & drop toggles)
- [ ] Step 5: Roadmap preview
- [ ] Step transitions (fade/slide)
- [ ] Form validation
- [ ] Back navigation with data preservation

### Phase 9: Settings
- [ ] Settings layout (sidebar + content)
- [ ] Profile section (avatar, name, email, role)
- [ ] Plan & Billing section
- [ ] Clients management section
- [ ] Portal branding section (logo upload, accent color)
- [ ] Account section (delete with confirmation)
- [ ] Auto-save pattern
- [ ] Tab navigation (URL-based)

### Phase 10: Client Portal
- [ ] Separate layout (no app nav)
- [ ] Custom branding (logo, accent color)
- [ ] Project header + progress
- [ ] Phase roadmap (read-only, orange accent)
- [ ] Checklist (read-only)
- [ ] "Powered by Stage" footer
- [ ] Preview banner (when viewed from settings)
- [ ] Mobile responsive (clients view on phone)

---

## 10. Integration Points

All places where auth/backend will be plugged in later:

### Auth (`src/lib/auth.ts`)

```typescript
// PLACEHOLDER - will become Clerk or Auth0
export async function getCurrentUser(): Promise<User | null> { /* mock user */ }
export async function signIn(email: string): Promise<void> { /* no-op */ }
export async function verifyCode(code: string): Promise<{ isNewUser: boolean }> { /* mock */ }
export async function signOut(): Promise<void> { /* no-op */ }
export function useAuth(): { user: User | null; isLoading: boolean } { /* mock */ }
```

### Data (`src/lib/api.ts`)

```typescript
// PLACEHOLDER - will become Convex queries/mutations or tRPC calls
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
// PLACEHOLDER - will become Stripe
export async function createCheckoutSession(plan: 'yearly'): Promise<string> { /* mock URL */ }
export async function getSubscription(): Promise<Subscription | null> { /* mock */ }
export async function cancelSubscription(): Promise<void> { /* no-op */ }
```

---

## 11. Conversion & Psychology Notes

### Landing page

- **Headline should name pain:** "Stop losing track of your creative projects" > "Project management tool"
- **Social proof is prominent:** "Join 500+ designers who..." (or the real number once available)
- **Annual plan only** -> lower churn, faster willingness-to-pay validation
- **"Limited early access" framing** -> urgency, exclusivity
- **Dashboard screenshot as hero visual** -> show product, no abstract illustrations

### Onboarding

- **Progress indicator** (step X of Y) -> loss aversion, people want to finish
- **AI-generated roadmap** as default -> low friction, instant value
- **First project created IN onboarding** -> user immediately has something to look at

### Retention

- **Timeline as "home"** -> each app open starts with overview
- **Progress feedback loop** -> checkbox -> progress bar update -> percentage -> dopamine
- **Share client portal** -> social commitment, harder to churn when client is watching
- **"Powered by Stage"** in portal -> viral loop: client sees -> gets curious -> becomes a user

### Paywall

- **Non-blocking in v1** -> let people experience product
- **Project limit on free plan** -> upgrade trigger once value is clear
- **Upgrade prompt at natural moments** -> "Share with client" (locked), creating 4th project

---

## 12. Improvement Suggestions vs Specs

| Improvement | Why | Impact |
|-------------|--------|--------|
| **"Powered by Stage" link in portal footer** | Free marketing on every client share | High - viral loop |
| **Onboarding progress indicator** | Loss aversion, higher completion rate | High - retention |
| **Keyboard shortcuts** | Designers expect this (`Cmd+K` search, etc.) | Medium - power users |
| **"Invite to Stage" in client portal** | Client -> designer pipeline | Medium - growth |
| **Email digest** | Weekly project progress summary | Medium - re-engagement |
| **Subtle "Today" marker on timeline** | Spec mentions it but prototypes miss it | Low - polish |
| **Scroll-to-active-phase** | On project detail load, scroll to active phase | Low - UX |
| **Drag handles visible only on hover** | Cleaner checklist default state | Low - polish |

---

## 13. Risks & Mitigation

| Risk | Impact | Mitigation |
|--------|--------|-----------|
| **SF Pro Display unavailable on Windows/Android** | Headings look different | Fallback to system font is acceptable - audience is designers on Mac |
| **Timeline SVG performance with many projects** | Lag at 20+ projects | Virtualization + canvas fallback if needed |
| **Tiptap bundle size** | +200kb for editor | Lazy load only on task detail route |
| **Auth integration later** | Refactoring risk | Abstraction layer (`src/lib/auth.ts`) keeps impact minimal |
| **Backend decision later** | Data model changes | TypeScript types + mock data as contract - backend must respect these types |
| **March 10 deadline** | Tight planning needed | Build everything - phases 1-10 executed sequentially |
