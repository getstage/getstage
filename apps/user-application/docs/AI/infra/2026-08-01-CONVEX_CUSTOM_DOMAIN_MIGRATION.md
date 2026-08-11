# Convex custom domain migration — 2026-08-01

> **Status:** planning — nothing switched yet
> **Driver:** client requirement. Convex is on the Pro plan, custom domains unlocked.
> **Scope:** move Convex API + HTTP actions from `*.convex.cloud` / `*.convex.site` onto `getstage.co` subdomains, production first.
> **Related:** [`R2_PUBLIC_DOMAIN_AUDIT.md`](R2_PUBLIC_DOMAIN_AUDIT.md) — R2 already runs on `assets.getstage.co`, same pattern.

---

## Deployments today

| Track | Convex deployment | API (WebSocket / queries) | HTTP actions |
|---|---|---|---|
| Production | `quirky-snail-763` | `https://quirky-snail-763.convex.cloud` | `https://quirky-snail-763.convex.site` |
| Testing | `reliable-bullfrog-917` | `https://reliable-bullfrog-917.convex.cloud` | `https://reliable-bullfrog-917.convex.site` |

Convex configures the two separately. **They must be different hostnames** — one custom domain cannot serve both.

## Target

| Track | Convex API | HTTP actions |
|---|---|---|
| Production | `api.getstage.co` | `hooks.getstage.co` |
| Testing | `api.testing.getstage.co` | `hooks.testing.getstage.co` |

`getstage.co`, `www.getstage.co`, `stage.getstage.co` and `testing.getstage.co` stay pointed at the Cloudflare Worker — do not reuse them.

---

## The one thing that can break every signed-in user

`packages/data-ops/convex/auth.config.ts`:

```ts
domain: getEnv("CONVEX_SITE_URL")
```

That value is the **OIDC issuer**. Convex Auth mints JWTs with `iss` set to it and publishes the keys at `{CONVEX_SITE_URL}/.well-known/jwks.json`.

Override `CONVEX_SITE_URL` in the Convex dashboard and the issuer changes. Every token minted before the switch now fails validation, and every signed-in user gets `Not authenticated` on every query until they sign in again — the same failure mode as the "Stage needs a quick refresh" incident, but permanent until re-auth.

**Adding a custom domain does not do this.** The "Custom Domains" panel and the "Override Environment Variables" panel are independent:

- Add a custom domain → both the new hostname *and* the original `*.convex.site` keep serving. Nothing breaks.
- Override `CONVEX_SITE_URL` → issuer moves, sessions break, and every webhook registered against the old hostname has to be re-pointed the same minute.

So: **migrate clients onto the new hostnames first, and treat the env override as a separate, optional, scheduled step.** Everything below is designed so the override is never required.

---

## Hardcoded references

### Code that must change

| File | Reference | Note |
|---|---|---|
| `apps/web-application/wrangler.jsonc` | `CONVEX_HTTP_ORIGIN` × 3 envs | Worker proxies `/api/*`, `/stripe/*`, `/integrations/*` here. **Primary switch.** |
| `apps/web-application/src/features/settings/useIntegrationsSettings.ts:28` | fallback `reliable-bullfrog-917.convex.site` | Only used when `VITE_CONVEX_SITE_URL` is unset. |
| `apps/web-application/scripts/smoke/shared.mjs:1` | default smoke base URL | Testing only. |
| `apps/figma-exporter/scripts/build.mjs:5-6` | `PROD_API_BASE` / `DEV_API_BASE` | Baked into the published plugin. |
| `apps/figma-exporter/scripts/package-zip.mjs:9` | prod default | Same. |
| `apps/figma-exporter/manifest.json` | `networkAccess.allowedDomains` | **Requires Figma re-review — see below.** |
| `apps/user-application/public/figma-exporter-manifest.json` | allowlist copy shipped in the desktop app | Keep in sync. |
| `apps/stage-engine/src/config/mod.rs:94` | dev fallback `reliable-bullfrog-917.convex.cloud` | Dev only; env wins. |
| `apps/user-application/src/lib/convex.ts:4` | `DEFAULT_TESTING_CONVEX_URL` | Dev only; `VITE_CONVEX_URL` wins. |
| `apps/user-application/electron/helpers/sidecar.ts:50` | dev fallback | Dev only. |

### Code that silently degrades

`apps/user-application/electron/helpers/desktop-api.ts:30-36`

```ts
if (trimmed.endsWith(".convex.cloud")) {
  return `${trimmed.replace(".convex.cloud", ".convex.site")}/api/v1`;
}
return null;
```

Derives the HTTP-actions URL by string-replacing the hostname. With `api.getstage.co` it returns `null`.

Impact is limited: this path only runs **unpackaged** (`!app.isPackaged`) and falls back to `TESTING_DESKTOP_API_URL`. Packaged builds resolve through `getDesktopAuthUrl()` instead. So it is a local-dev papercut, not a production break — but it must not be left as the mechanism once the hostnames stop being derivable from each other.

### Environment files (not code)

`app/.env.local`, `app/.env.production`, `apps/user-application/.env`, `apps/web-application/.env.production`, `apps/web-application/.env.testing`, `.github/workflows/release-desktop.yml` (`DESKTOP_VITE_CONVEX_URL` secret).

### Third-party registrations pointing at `*.convex.site`

Only relevant if `CONVEX_SITE_URL` is ever overridden — otherwise the old hostname keeps working and these stay valid.

- Resend webhook → `{CONVEX_SITE_URL}/resend-webhook`
- Stripe Connect → `/stripe/connect/callback`, `/stripe/connect/webhook`
- Notion OAuth → `/integrations/notion/callback`
- Figma OAuth → `/integrations/figma/callback`
- Email unsubscribe links already sent → `/emails/unsubscribe`

Unsubscribe links live in inboxes forever. That alone is a reason never to retire the original `.convex.site` hostname.

---

## How this rides along with the production design release

Production desktop is on `prod-v0.2.15`; testing is on `v0.2.18`, which carries the wireframes
per-screen rewrite and the auth-refresh fix. Both the domain switch and that release need one
new desktop build, so steps 3 and 4 below are deliberately the *same* build.

What decides where the desktop points is a GitHub Environment secret, not code:
`release-desktop.yml` resolves `prod-v*` → environment `production` and `v*` → `testing`, and
each environment holds its own `DESKTOP_VITE_CONVEX_URL`. Repointing production is a settings
change.

What must **not** be combined: steps 1 and 2 are infrastructure and reversible in seconds;
shipping them together with a feature release means a failure has two possible causes. Do the
domains first, prove them, then release.

| Step | Who | Reversible |
|---|---|---|
| 1. Add domains + DNS | Adrien (Convex dashboard) | Yes — old hostnames keep serving |
| 2. Worker `CONVEX_HTTP_ORIGIN` | Werner (deploy) | Yes — revert var, < 1 min |
| 3. Production `DESKTOP_VITE_CONVEX_URL` | Werner (repo settings) | Yes — until a build uses it |
| 4. Merge PR #74 → tag `prod-v0.2.18` | Werner | New tag required |
| 5. Figma plugin allowlist | Werner — **start at step 1**, review takes days | Publish again |

Gate on step 4: Adrien signs off on `v0.2.18` on testing first. Prod jumps three versions and
the per-screen wireframes path has one successful production-shaped run behind it — that is
thin evidence to pair with a DNS migration on the same day.

---

## Production checklist

### 1. DNS + Convex

- [ ] Convex prod → Settings → Custom Domains → add `api.getstage.co` as **Convex API**
- [ ] Convex prod → add `hooks.getstage.co` as **HTTP Actions**
- [ ] Add the CNAME records Convex shows, in the same Cloudflare zone
- [ ] Wait for both to report **Active** (certificate issued)
- [ ] Do **not** touch Override Environment Variables

### 2. Verify the new hostnames before moving any client

- [ ] `curl -sI https://hooks.getstage.co/.well-known/openid-configuration` → `200`
- [ ] `curl -s https://hooks.getstage.co/.well-known/jwks.json` → same keys as the `.convex.site` response
- [ ] Confirm `https://quirky-snail-763.convex.site` still answers — both must work

### 3. Web app (Cloudflare Worker)

- [ ] `wrangler.jsonc` → production `CONVEX_HTTP_ORIGIN` = `https://hooks.getstage.co`
- [ ] Deploy production worker
- [ ] Smoke: sign in on `getstage.co`, load a project, run one AI action
- [ ] Roll back by reverting the var if anything 5xx's — no data risk

### 4. Desktop app

- [ ] GitHub secret `DESKTOP_VITE_CONVEX_URL` = `https://api.getstage.co`
- [ ] Replace the `convexCloudToSiteApiBase` derivation with an explicit `VITE_CONVEX_SITE_URL`
- [ ] Ship on a `prod-v*` tag, verify sign-in + a project load on a clean machine

### 5. Figma plugin — start this first, it is the long pole

Figma re-reviews a plugin whenever `networkAccess.allowedDomains` changes, and that takes days.

- [ ] Add the new hostnames to the allowlist **while keeping the old ones**
- [ ] Publish, wait for approval
- [ ] Only after approval, switch `PROD_API_BASE` to `https://hooks.getstage.co`
- [ ] Keep both entries until every user has the updated plugin

### 6. Testing track

Repeat with `api.testing.getstage.co` / `hooks.testing.getstage.co` on `reliable-bullfrog-917`. Do this **after** production is proven, so a mistake never blocks the release pipeline.

---

## Explicitly not doing

- Overriding `CONVEX_SITE_URL` / `CONVEX_CLOUD_URL`. Forces every user to sign in again and invalidates every registered webhook and every unsubscribe link already in an inbox. If it is ever wanted, it is its own scheduled migration with the webhook re-registrations done in the same window.
- Retiring the `*.convex.site` hostname. It stays reachable indefinitely.

## Verification

| Check | How |
|---|---|
| Auth unaffected | An already-signed-in session keeps working across the worker switch |
| HTTP actions reachable | Stripe/Notion/Figma callbacks still complete |
| No mixed origins | Browser devtools shows one Convex host, not two |
| Rollback | Revert `CONVEX_HTTP_ORIGIN`, redeploy worker — under a minute |
