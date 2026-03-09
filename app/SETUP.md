# Stage App Setup Guide (Current Repo State)

This project is wired as:

- Vite + React frontend with TanStack Router/Query
- Convex backend (Auth, Stripe component, R2 component)
- Cloudflare Worker wrapper for hosting the built Vite assets
- Deployment via Wrangler scripts in `package.json`
- Styling via Tailwind v4 and gsap/motion for animation

## 1) Tech stack snapshot (as currently installed)

From `[app/package.json](/Users/wdiebenwdambitions/stagemvp/app/package.json)`:

- Frontend:
  - React 19
  - Vite 6
  - `@tanstack/react-router` + `@tanstack/react-query`
  - `@vitejs/plugin-react`, `@tanstack/router-plugin`
  - `vite-tsconfig-paths` with path alias `@/*`
- Backend:
  - `convex` + `@convex-dev/auth`
  - `@convex-dev/r2`
  - `@convex-dev/stripe`
- Deployment/tooling:
  - `wrangler`
  - Cloudflare Worker in `app/worker/index.ts`
  - `pnpm` scripts for local dev/build and Cloudflare deploy/upload

## 2) Project files that define infra

- Frontend config: `[app/vite.config.ts](/Users/wdiebenwdambitions/stagemvp/app/vite.config.ts)`
- Convex components: `[app/convex/convex.config.ts](/Users/wdiebenwdambitions/stagemvp/app/convex/convex.config.ts)`
- Convex HTTP routes: `[app/convex/http.ts](/Users/wdiebenwdambitions/stagemvp/app/convex/http.ts)`
- Cloudflare worker: `[app/worker/index.ts](/Users/wdiebenwdambitions/stagemvp/app/worker/index.ts)`
- Wrangler config: `[app/wrangler.jsonc](/Users/wdiebenwdambitions/stagemvp/app/wrangler.jsonc)`
- Current sample env: `[app/.env.local](/Users/wdiebenwdambitions/stagemvp/app/.env.local)` (contains sample/local values)

## 3) Setup from scratch (recommended order)

1. Install prerequisites
   - Node.js + pnpm
   - Cloudflare account + Wrangler auth (`wrangler login`)
   - Convex account + CLI (via `npx convex` from the project)
   - Stripe account + Stripe CLI/webhook capabilities (if using production billing flows)
   - Loops account for OTP transactional emails
   - Google OAuth app (if you keep Google provider enabled)

2. Install dependencies

```bash
cd /Users/wdiebenwdambitions/stagemvp/app
pnpm install
```

3. Provision Convex project and link CLI
   - Run `npx convex dev` (or your normal Convex login/link workflow) from `app/`
   - Make sure Convex is linked and `convex.config.ts` components can be used
   - Apply/refresh generated code after schema/config changes (`npx convex dev` or codegen step from your workflow)

4. Set environment variables
   - Frontend environment comes from `.env`-style vars prefixed with `VITE_`
   - Backend/component environment is set in Convex deployment settings
   - Wrangler deploy environment is controlled by `[app/wrangler.jsonc](/Users/wdiebenwdambitions/stagemvp/app/wrangler.jsonc)`

## 4) Environment variables used by current code

### 4.1 Frontend env (Vite)

Required:
- `VITE_CONVEX_URL`
  - Required by `[app/src/lib/convex.ts](/Users/wdiebenwdambitions/stagemvp/app/src/lib/convex.ts)`
  - Must point at your Convex deployment URL

Optional / currently present in `.env.local`:
- `VITE_AUTH_DEV_BYPASS`
- `VITE_CONVEX_SITE_URL` (present but not directly referenced in current frontend code)

### 4.2 Convex env used in code

From:
- `[app/convex/auth.config.ts](/Users/wdiebenwdambitions/stagemvp/app/convex/auth.config.ts)`
- `[app/convex/billing.ts](/Users/wdiebenwdambitions/stagemvp/app/convex/billing.ts)`
- `[app/convex/stripeConnect.ts](/Users/wdiebenwdambitions/stagemvp/app/convex/stripeConnect.ts)`
- `[app/convex/LoopsOTP.ts](/Users/wdiebenwdambitions/stagemvp/app/convex/LoopsOTP.ts)`

Set:
- `CONVEX_SITE_URL` (used for OAuth callback URL construction)
- `SITE_URL` (used for billing/stripe redirects and callback return URLs)
- `STRIPE_SECRET_KEY`
- `STRIPE_CONNECT_CLIENT_ID`
- `STRIPE_YEARLY_PRICE_ID` (preferred)
- `STRIPE_PRICE_ID` (fallback when yearly id not set)
- `AUTH_LOOPS_API_KEY` or `LOOPS_API_KEY`
- `AUTH_LOOPS_TRANSACTIONAL_ID` or `LOOPS_TRANSACTIONAL_ID`

For Google auth provider in `[app/convex/auth.ts](/Users/wdiebenwdambitions/stagemvp/app/convex/auth.ts)`, ensure your Google OAuth credentials are configured according to your auth setup (matching `@auth/core` provider expectations).

### 4.3 Convex component setup expectations

- `@convex-dev/r2` and `@convex-dev/stripe` are registered in
  `[app/convex/convex.config.ts](/Users/wdiebenwdambitions/stagemvp/app/convex/convex.config.ts)`
- R2 usage entry points in `[app/convex/r2.ts](/Users/wdiebenwdambitions/stagemvp/app/convex/r2.ts)`
- Stripe webhook endpoint is exposed at `"/stripe/webhook"` in `[app/convex/http.ts](/Users/wdiebenwdambitions/stagemvp/app/convex/http.ts)` via `registerRoutes`
- Stripe Connect callback endpoint is `"/stripe/connect/callback"`

## 5) Commands

From `[app/package.json](/Users/wdiebenwdambitions/stagemvp/app/package.json)`:

```bash
pnpm run dev                    # local Vite dev server (port 3000)
pnpm run build                  # production Vite build
pnpm run build:testing          # tsc + Vite build with testing mode
pnpm run build:production       # tsc + Vite build with production mode
pnpm run preview                # preview built site locally
pnpm run typecheck              # TypeScript no-emit check
pnpm run stage:deploy           # build:testing + wrangler deploy -e testing
pnpm run stage:upload           # build:testing + wrangler versions upload -e testing
pnpm run production:deploy      # build:production + wrangler deploy -e production
pnpm run production:upload      # build:production + wrangler versions upload -e production
pnpm run cf:typegen             # generate worker env types from Wrangler
```

## 6) Cloudflare Worker + Wrangler notes

`[app/wrangler.jsonc](/Users/wdiebenwdambitions/stagemvp/app/wrangler.jsonc)` is configured for:
- `assets.binding = "ASSETS"` from `dist/`
- `env.testing.name = stage-app-testing`
- `env.production.name = stage-app-production`
- SPA fallback (`not_found_handling = "single-page-application"`)

Current worker (`app/worker/index.ts`) simply delegates all requests to ASSETS, so runtime logic currently lives in the Convex backend and frontend bundles.

## 7) What to check before first run

1. Ensure `pnpm install` succeeds in `app/`.
2. Confirm `.env` has `VITE_CONVEX_URL`.
3. Confirm Convex deployment exists and has:
   - Auth provider configured (Google + Loops OTP path)
   - R2 component installed/configured
   - Stripe component + webhook URL reachable (`/stripe/webhook`)
4. Confirm Stripe Connect callback URL in your Stripe app points to:
   - `${CONVEX_SITE_URL}/stripe/connect/callback`
5. Confirm worker can build and serve `dist`:
   - `pnpm run build`
   - `pnpm run stage:deploy` (or `production`)

## 8) Fast checklist (copy/paste)

- [ ] Install dependencies
- [ ] Fill frontend `.env` (`VITE_CONVEX_URL` at minimum)
- [ ] Configure Convex env vars listed above
- [ ] Run `pnpm run dev` and verify local auth/login + basic flows
- [ ] Run `pnpm run build:testing`
- [ ] Run `pnpm run stage:deploy` (or production variant)

