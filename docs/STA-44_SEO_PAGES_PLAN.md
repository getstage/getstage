# STA-44 SEO pages: use cases, blog and domain fix

> **Status:** Built on branch `feat/sta-44-seo-pages` (base `work`). Not deployed.
> **Owner:** Wessel (Linear `STA-44`)
> **Last updated:** 2026-09-28
> **Language:** All public pages are English.

## Goal

Make getstage.co rank and share well: one canonical domain, a page per audience and job (use cases), and a blog built from the YouTube videos. Every public page must be readable without JavaScript, with its own title, description, preview image and structured data.

## What Stage can do today (source for all marketing copy)

Only claim what ships. When the product changes, update `apps/web-application/src/marketing/useCases.ts` too.

- Native macOS app. Projects are websites, web apps or iOS apps.
- Research: competitor analysis (up to 4 competitors per run), positioning, patterns and a strategy you approve. Briefs can be uploaded as PDF or Markdown.
- Visual direction: moodboards from pulled references, Figma imports or uploads, carried into a generated style guide (atmosphere, palette, typography, components).
- Structure: user flows and Lo-Fi wireframes; export to Figma and FigJam.
- Skills: install skills and component libraries from the Stage marketplace or import your own from GitHub.
- Export: Markdown brief plus `AGENTS.md` for Cursor, Claude Code, Codex or any coding agent.
- Client portal for sharing progress.
- Plans: Solo $29 (1 seat, 2,000 credits), Studio $99 (5 seats, 10,000 pooled credits), Agency $249 (15 seats, 30,000 pooled credits). 14-day free trial.
- Stage does **not** produce finished high-fidelity screens.

## Linear breakdown

### 1. Domain and technical SEO (done on branch)

- [x] Replace every `usestage.com` reference with `getstage.co` (canonical, Open Graph, Twitter, schema.org). Deleted the two unused legacy landing pages that still carried it.
- [x] Homepage static meta matches the live positioning; schema says macOS and the real starting price instead of "Web" and $0.
- [x] Pre-render: `pnpm build` now runs `scripts/prerender-marketing.mjs`, which server-renders every use-case and blog page into `dist/<path>.html` with its own head and JSON-LD. Cloudflare serves `/blog/<slug>` from `blog/<slug>.html`; the SPA then mounts over the same markup.
- [x] `sitemap.xml` generated at build; `robots.txt` points to it.
- [x] `/use-cases` and `/blog` added to the public web routes (the web app redirects every unknown path to `/`).
- [ ] After deploy: add getstage.co to Google Search Console, submit `https://getstage.co/sitemap.xml`, request indexing for `/`, `/use-cases` and `/blog`.
- [ ] After deploy: check previews in the LinkedIn Post Inspector and the X card validator.

### 2. Use cases (done on branch)

Hub at `/use-cases`, grouped like Storyflow, but with 6 in-depth pages instead of 20 thin ones.

| Group | Page | Target intent |
|---|---|---|
| Who it's for | `/use-cases/freelance-designers` | freelance designer AI workflow |
| Who it's for | `/use-cases/agencies` | agency design process, team tool |
| Who it's for | `/use-cases/vibe-coders` | plan for Cursor / Claude Code / Codex |
| Who it's for | `/use-cases/founders` | plan an MVP before building |
| What you do | `/use-cases/competitor-research` | AI competitor research |
| What you do | `/use-cases/moodboards-and-style-guides` | moodboard / style guide for AI builds |

Each page: problem, 4 steps in Stage, outcomes, FAQ (`FAQPage` schema), trial CTA, links to other use cases. Navigation and footer link to the hub.

- [ ] Adrien reviews the copy for tone and accuracy.
- [ ] Add product screenshots per page (one per step is enough).
- [ ] Later: category pages (Websites / Web apps / iOS apps) once there is enough distinct content.

### 3. Blog layout (done on branch)

- Overview `/blog`: cards with the YouTube thumbnail, category, date, title and summary.
- Post `/blog/<slug>`: title and summary, video (thumbnail first; the YouTube iframe only loads on click), clickable chapters that start the video at that time, the written article, related use cases and a trial CTA.
- Schema: `BlogPosting`, `VideoObject` (thumbnail, upload date, embed URL, duration) and `BreadcrumbList`.

### 4. First posts (done on branch)

| Post | Video | Angle |
|---|---|---|
| `/blog/8-underrated-websites-every-vibe-coder-needs` | `8GfWKFyAaW4` (2026-09-26) | List post for "vibe coding tools" searches; Stage as the planning layer |
| `/blog/is-this-the-new-way-to-design` | `KM8HA2pc6Rg` (2026-07-07) | Case study: real coffee-brand project end to end |

Thumbnails are stored in `apps/web-application/public/blog/<youtubeId>.jpg` (1280×720, from YouTube `maxresdefault`).

- [ ] Adrien reviews both articles. The text is written from the video descriptions and chapters; add specifics from the videos (tool links, results from the coffee-brand project) where useful.
- [ ] Add the duration for `KM8HA2pc6Rg` to `blogPosts.ts` (needed for richer video results).

### 5. Adding a new blog post

All marketing content now lives in `apps/web-application/src/marketing/content/content.json` and is published with `pnpm web:ship` (STA-47). Guide: `apps/web-application/src/marketing/content/README.md`.

## Separate Linear issue: Stripe plan switching and seat downgrades

Not SEO. Tracked in [`STA-43_USER_FEEDBACK_RECOVERY_PLAN.md`](STA-43_USER_FEEDBACK_RECOVERY_PLAN.md), section "Seat downgrades and Stripe customer portal". Code is on PR #81 (`fix/team-invite-upgrade-gate`, testing tag `v0.2.47`). Open: testing Convex deploy, Stripe test-mode checks, then production deploy, then live portal settings.

## Release

Deploying the website is a separate, explicit step after review: `pnpm run testing:deploy` (testing.getstage.co) first, then `pnpm run production:deploy` (getstage.co), both from `apps/web-application`. Both build scripts include the pre-render.
