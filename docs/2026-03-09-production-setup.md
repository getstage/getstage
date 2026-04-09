# Production Setup Guide — 2026-03-09

## Deployments Overview

| Environment | Convex Deployment | Convex URL | Convex Site URL | Cloudflare Worker |
|---|---|---|---|---|
| Testing | `dev:reliable-bullfrog-917` | `https://reliable-bullfrog-917.convex.cloud` | `https://reliable-bullfrog-917.convex.site` | `stage-app-testing` |
| Production | `prod:quirky-snail-763` | `https://quirky-snail-763.convex.cloud` | `https://quirky-snail-763.convex.site` | `stage-app-production` |

## CLI Access

- **Testing:** uses `CONVEX_DEPLOY_KEY` in `.env.local`
- **Production:** uses `CONVEX_DEPLOY_KEY` in `.env.prod` — pass `--env-file .env.prod` to any `npx convex` command

## Already Done

### Testing (dev deployment)
All env vars set:
- AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET
- AUTH_LOOPS_API_KEY, AUTH_LOOPS_TRANSACTIONAL_ID
- JWKS, JWT_PRIVATE_KEY
- R2_ACCESS_KEY_ID, R2_BUCKET, R2_ENDPOINT, R2_SECRET_ACCESS_KEY, R2_TOKEN
- SITE_URL = `https://testing.getstage.co`
- STRIPE_SECRET_KEY = `sk_test_...`
- STRIPE_WEBHOOK_SECRET = `whsec_caHk4EEukjf6mAyRqwFeo2X0h74VoBZV`
- STRIPE_YEARLY_PRICE_ID = `price_1T92ESE7todDIVj7VZprxRbY`

Stripe test webhook configured:
- Endpoint: `https://reliable-bullfrog-917.convex.site/stripe/webhook`
- 12 events selected

### Production (prod deployment)
Env vars copied:
- AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET
- AUTH_LOOPS_API_KEY, AUTH_LOOPS_TRANSACTIONAL_ID
- R2_ACCESS_KEY_ID, R2_BUCKET, R2_ENDPOINT, R2_SECRET_ACCESS_KEY, R2_TOKEN

**NOT copied (must be unique per deployment):**
- JWKS, JWT_PRIVATE_KEY → generate with `npx convex auth --env-file .env.prod`

## Still TODO

### 1. Generate auth keys for production
Each deployment needs its own JWKS + JWT_PRIVATE_KEY (do NOT copy from dev — that's a security risk).
```bash
npx convex auth --env-file .env.prod
```
This generates and sets a fresh key pair on the production deployment.

### 2. Set production-only env vars
```bash
npx convex env set SITE_URL "https://getstage.co" --env-file .env.prod
npx convex env set STRIPE_SECRET_KEY "sk_live_..." --env-file .env.prod
npx convex env set STRIPE_WEBHOOK_SECRET "whsec_..." --env-file .env.prod
npx convex env set STRIPE_CONNECT_CLIENT_ID "ca_..." --env-file .env.prod
npx convex env set STRIPE_CONNECT_WEBHOOK_SECRET "whsec_..." --env-file .env.prod
npx convex env set STRIPE_YEARLY_PRICE_ID "price_..." --env-file .env.prod
```

To get the Stripe live values:
1. Switch Stripe dashboard to **live mode**
2. In **Settings > Connect > Onboarding options > OAuth**, add the live redirect URI:
   - `https://quirky-snail-763.convex.site/stripe/connect/callback`
3. Enable live OAuth and copy the live `ca_...` client ID
4. Create a product + price (or use the same product if already created in live)
5. Copy `sk_live_...` from API keys
6. Create a **new billing webhook endpoint** for production:
   - URL: `https://quirky-snail-763.convex.site/stripe/webhook`
   - Same 12 events as testing
   - Copy the signing secret (`whsec_...`)
7. Create a **new Connect webhook endpoint** for production:
   - URL: `https://quirky-snail-763.convex.site/stripe/connect/webhook`
   - Listen to **events on connected accounts**
   - Select:
     - `account.application.deauthorized`
     - `account.updated`
   - Copy the signing secret (`whsec_...`)

### 3. Deploy Convex functions to production
```bash
npx convex deploy --env-file .env.prod
```

### 4. Create frontend env files

**`.env.testing`**
```
VITE_CONVEX_URL=https://reliable-bullfrog-917.convex.cloud
```

**`.env.production`**
```
VITE_CONVEX_URL=https://quirky-snail-763.convex.cloud
```

These are picked up by Vite's `--mode` flag in the build scripts.

### 5. Deploy Cloudflare Workers
```bash
pnpm run stage:deploy        # builds with --mode testing, deploys to stage-app-testing
pnpm run production:deploy   # builds with --mode production, deploys to stage-app-production
```

Cloudflare Worker observability is configured in `app/wrangler.jsonc` with:
- logs enabled
- invocation logs enabled
- traces disabled

## Stripe Webhook Events (both environments)

Select these 12 events when creating webhook endpoints:
- `checkout.session.completed`
- `customer.created`
- `customer.updated`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.created`
- `invoice.finalized`
- `invoice.paid`
- `invoice.payment_failed`
- `payment_intent.succeeded`
- `payment_intent.payment_failed`

## Architecture Note: Webhooks & Concurrency

The `@convex-dev/stripe` component handles webhooks without needing queues or background jobs (unlike Hono/FastAPI setups). Convex mutations are transactional and serialized — concurrent webhook events are processed safely. Stripe retries failed webhooks automatically for up to 3 days.
