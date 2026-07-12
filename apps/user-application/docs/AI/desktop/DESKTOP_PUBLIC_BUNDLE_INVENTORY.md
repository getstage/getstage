# Desktop public bundle inventory

> **Purpose:** Minimize what leaves the machine in a **public** Stage Desktop build.  
> Everything in a `prod-v*` GitHub Release DMG is extractable. Treat the app as public.  
> **Last audited:** 2026-07-10 · package `0.2.11` · workflow `.github/workflows/release-desktop.yml`

Related: [`PUSH_AND_BUNDLE_DESKTOP_RELEASE.md`](./PUSH_AND_BUNDLE_DESKTOP_RELEASE.md) · [`RELEASE_DESKTOP_STEPS.md`](./RELEASE_DESKTOP_STEPS.md)

---

## Caption legend

| Caption | Meaning |
|---------|---------|
| **SHIP** | Required in the DMG / zip. Keep. |
| **PUBLIC OK** | Visible to users; must stay non-secret. |
| **DO NOT BAKE** | Never write into the binary, `runtime-secrets.env`, or Vite `define`. |
| **NOT WISE** | Works today but risky for public releases — remove or gate before next prod. |
| **CI ONLY** | Lives in GitHub Actions / Environments — never in the client. |
| **TESTING ONLY** | Fine on `v*` artifact builds; do not promote to `prod-v*` as-is. |

---

## Tag tracks (what “push” means)

| Tag / action | Caption | What happens |
|--------------|---------|--------------|
| `v0.x.y` | **TESTING ONLY** | Builds DMG → **workflow artifacts only**. No public GitHub Release. |
| `prod-v0.x.y` | **SHIP** (public) | Builds DMG → **public** GitHub Release (`Latest`). Anyone can download. |
| `workflow_dispatch` + track `testing` | **TESTING ONLY** | Same as `v*` unless you force publish. |
| `workflow_dispatch` + track `production` + publish | **SHIP** (public) | Same risk as `prod-v*`. |

**Rule:** Do not push `prod-v*` until this inventory is green for secrets.

---

## What electron-builder actually packs

Source: `electron-builder.yml` → `files` + `extraResources`.

| Path in app | Caption | Notes |
|-------------|---------|-------|
| `out/**/*` (asar) | **SHIP** | Main + preload + renderer build. Source maps excluded (`!**/*.map`). |
| `package.json` | **SHIP** | Version / name only. |
| `Resources/stage-engine/stage-engine` | **SHIP** | Packaged Rust binary (~10 MB). No `.env` inside. |
| `Resources/runtime-secrets.env` | **PUBLIC OK** / **DO NOT BAKE** keys | Only public config allowed (see below). |
| `Resources/public/apple-touch-icon.png` | **SHIP** | Branding asset. |

**Not packed (good):** `docs/`, `.agents/`, `src/` TypeScript, Convex functions, `node_modules` tree, `.env`, Apple certs, GitHub secrets.

---

## Baked into the client at build time (Vite `define` / env)

From `electron.vite.config.ts` + CI env in `release-desktop.yml`.

| Value | Caption | Why |
|-------|---------|-----|
| `VITE_CONVEX_URL` / `DESKTOP_VITE_CONVEX_URL` | **PUBLIC OK** | Deployment URL is public by design. Use **testing** Convex for `v*`, **prod** Convex for `prod-v*`. Wrong URL = wrong data plane. |
| `STAGE_DESKTOP_AUTH_URL` | **PUBLIC OK** | Login handoff URL (`testing.getstage.co` vs `getstage.co`). Must match track. |
| `VITE_BRANDFETCH_CLIENT_ID` | **PUBLIC OK** | Brandfetch “Logo Link” client id is designed to be public. Still: use a dedicated Stage id, not a personal one. |
| `STAGE_DESKTOP_UPDATES_URL` | **PUBLIC OK** | Optional public update feed (e.g. R2). Prefer this over a GitHub PAT in the app. |
| `STAGE_UPDATE_GITHUB_TOKEN` (`DESKTOP_UPDATE_GITHUB_TOKEN`) | **NOT WISE** | Still **string-replaced into the main process bundle**. A PAT in a public DMG = leaked forever. Prefer public releases + public feed, or drop the token for `prod-v*`. |
| `R2_PUBLIC_BASE_URL` (via `runtime-secrets.env`) | **PUBLIC OK** | Custom domain for assets (e.g. `https://assets.getstage.co`). Not a secret. |

---

## Must never ship in the DMG

| Secret / material | Caption | Correct home |
|-------------------|---------|--------------|
| `REFERO_MCP_TOKEN` | **DO NOT BAKE** | Convex deployment env → `appSecrets` after sign-in. |
| `OPENROUTER_API_KEY` | **DO NOT BAKE** | Convex deployment env → `appSecrets` after sign-in. |
| Stripe / Resend / Loops / Stitch keys | **DO NOT BAKE** | Convex / server only. |
| Apple `CSC_LINK`, `CSC_KEY_PASSWORD`, `APPLE_*` | **CI ONLY** | GitHub Environment secrets for signing/notarization. |
| `DESKTOP_UPDATE_GITHUB_TOKEN` (fine-grained PAT) | **NOT WISE** / prefer **CI ONLY** unused | If repo is public, omit. If private, do not bake into public `prod-v*` DMGs. |
| Local `.env`, `.p12`, API keys in docs | **DO NOT BAKE** | Never commit; never copy into `resources/`. |
| Source maps (`.map`) | **DO NOT BAKE** | Already excluded — keep it that way. |
| Mock / debug flags (`VITE_MOCK_*`, `STAGE_DESKTOP_DEBUG`) | **TESTING ONLY** | Must be off in production builds. |

---

## GitHub Environments checklist (minimize blast radius)

Configure **two** Environments: `testing` and `production` (workflow already selects by tag).

| Secret / var | testing | production | Caption |
|--------------|---------|------------|---------|
| `DESKTOP_VITE_CONVEX_URL` | testing Convex | prod Convex | **PUBLIC OK** — must differ |
| `R2_PUBLIC_BASE_URL` | same or staging CDN | prod CDN | **PUBLIC OK** |
| `VITE_BRANDFETCH_CLIENT_ID` | ok | ok | **PUBLIC OK** |
| `STAGE_DESKTOP_AUTH_URL` (var) | `https://testing.getstage.co/auth/desktop` | `https://getstage.co/auth/desktop` | **PUBLIC OK** |
| `STAGE_DESKTOP_UPDATES_URL` (var) | optional | preferred public feed | **PUBLIC OK** |
| `DESKTOP_UPDATE_GITHUB_TOKEN` | optional for private repo | **omit for public prod** | **NOT WISE** if baked |
| Apple signing secrets | optional | required for Gatekeeper-clean | **CI ONLY** |
| Refero / OpenRouter | **never in desktop secrets** | **never** | **DO NOT BAKE** — Convex only |

---

## Size / surface minimization (next prod)

| Item | Caption | Action |
|------|---------|--------|
| `stage-engine` release binary | **SHIP** | Keep release build; do not ship `target/debug`. |
| Renderer vendor chunks | **SHIP** | Already split (`vendor-react`, etc.). Avoid shipping unused mock routes in prod. |
| `runtime-secrets.env` | **PUBLIC OK** | Only `R2_PUBLIC_BASE_URL`. Empty file is fine. |
| Docs / plans / skills in repo | N/A (not in DMG) | Still public on GitHub if repo is public — separate concern from DMG. |
| Dual arch DMGs + zip + blockmap + `latest-mac.yml` | **SHIP** for updates | Needed for auto-update; do not upload extra CI logs to the Release. |

---

## Pre-tag gate (copy/paste)

Before `git push origin prod-vX.Y.Z`:

1. [ ] Package version == tag (`0.2.11` ↔ `prod-v0.2.11`)
2. [ ] Environment = **production** secrets (Convex + auth URL)
3. [ ] `write-runtime-secrets.mjs` output contains **only** `R2_PUBLIC_BASE_URL` (or empty)
4. [ ] No `REFERO_*` / `OPENROUTER_*` in CI desktop env for this job
5. [ ] `DESKTOP_UPDATE_GITHUB_TOKEN` empty for public prod **or** update feed is public URL only
6. [ ] Smoke: sign-in → Research (Refero via Convex) → no key in `Contents/Resources/runtime-secrets.env`
7. [ ] Prefer `v*` artifact test first; only then `prod-v*`

---

## Current status (2026-07-10)

| Topic | Status |
|-------|--------|
| Refero / OpenRouter out of DMG | Done — fetch from Convex after auth |
| `runtime-secrets.env` public-only writer | Done — script allows only `R2_PUBLIC_BASE_URL` |
| Testing vs prod tag split | Done — `v*` artifacts / `prod-v*` public Release |
| Update GitHub PAT baked into main | **Still NOT WISE** — remove or stop defining for `prod-v*` |
| Old local `resources/runtime-secrets.env` comment | Stale text mentioning Refero/OpenRouter — regenerate before dist |

---

## One-line policy

**Public DMG = public URLs + binary + UI. All API keys live in Convex (or CI for Apple only). If you would not paste it in a tweet, do not bake it into `prod-v*`.**
