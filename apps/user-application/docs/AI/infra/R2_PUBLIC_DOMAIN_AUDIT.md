# R2 Public Custom Domain Audit

Last updated: 2026-06-06

Related: [`R2_STORAGE_CHANGE_AUDIT.md`](./R2_STORAGE_CHANGE_AUDIT.md) · [`MOODBOARD_CHANGE_AUDIT.md`](../moodboard/MOODBOARD_CHANGE_AUDIT.md)

## Decision

Testing bucket serves **stable public read URLs** through a Cloudflare R2 custom domain instead of signed `*.r2.cloudflarestorage.com` URLs.

| Item | Choice |
|------|--------|
| Custom domain (testing) | `https://assets-testing.getstage.co` |
| Custom domain (production) | `https://assets.getstage.co` (later) |
| Access | Public read via R2 custom domain |
| Legacy objects | Keep as-is; no bulk migration |
| Signed URL fallback | Remains when `R2_PUBLIC_BASE_URL` is unset |
| Upload flow | Unchanged (`generateUploadUrl` → PUT → `syncMetadata`) — desktop needs **`app://stage`** in bucket CORS (not `file://`) — see [CORS for desktop uploads](#cors-for-desktop-uploads) |

## CORS for desktop uploads

Packaged Stage uses origin **`app://stage`** (`window.location.origin` in DevTools). Uploads PUT to signed `*.r2.cloudflarestorage.com` URLs.

| Origin in CORS | Works for desktop upload? |
|----------------|---------------------------|
| `https://testing.getstage.co` | Web only |
| `file://` | **No** — legacy; remove |
| `app://stage` | **Yes** — confirmed 2026-06-06 |

**Bucket:** `assetsgetstage-testing` → Settings → CORS Policy.

Working policy (2026-06-06, Werner verified Create Project):

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:3001",
      "http://localhost:5173",
      "https://stage-app-testing.steep-resonance-f13d.workers.dev",
      "https://stage-app-production.steep-resonance-f13d.workers.dev",
      "https://testing.getstage.co",
      "https://getstage.co",
      "app://stage"
    ],
    "AllowedMethods": ["GET", "HEAD", "PUT"],
    "AllowedHeaders": ["Content-Type"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

**Do not use** `file://` — packaged app origin is `app://stage` since v0.1.46.

**Production:** same `app://stage` on prod bucket before prod DMG.

**IPC upload (planned next):** after the v0.1.51 deploy, move desktop uploads through Electron main/IPC so browser CORS no longer affects desktop reliability. See [`../desktop/DESKTOP_PERFORMANCE.md`](../desktop/DESKTOP_PERFORMANCE.md#ipc-upload--deferred-werner-to-review-later).

## URL contract

| At rest (Convex artifact / DB) | Returned to renderer |
|--------------------------------|----------------------|
| Stable object key, e.g. `moodboard/projects/{projectId}/users/{userId}/refero/{uuid}.jpg` | `https://assets-testing.getstage.co/moodboard/projects/{projectId}/users/{userId}/refero/{uuid}.jpg` |
| Legacy key, e.g. `users/{userId}/moodboard/{projectId}/refero/{uuid}.jpg` | Same base + legacy key path (404 if object missing — expected for old broken refs) |
| `https://` CDN URL (Refero fallback) | Pass through unchanged |

Keys stay the source of truth. URLs are derived on read.

## Code changes

| Layer | Files | Change | Reason | Notes |
|-------|-------|--------|--------|-------|
| Convex R2 | `packages/data-ops/convex/r2.ts` | Added `R2_PUBLIC_BASE_URL`, `buildPublicAssetUrl`, updated `resolveAssetUrl` | Never expose `r2.cloudflarestorage.com` to the UI when public domain is configured | Falls back to `r2.getUrl()` if env unset |
| Convex attachments | `packages/data-ops/convex/_helpers.ts` | `getAttachmentsForTask` uses `resolveAssetUrl` | Same public URL policy for task files | |
| Convex tasks | `packages/data-ops/convex/tasks.ts` | Attachment insert stores public URL via `resolveAssetUrl` | Stable URLs in DB (no expiring signatures) | |
| Convex Stitch | `packages/data-ops/convex/integrations/stitch.ts` | Generated design `imageUrl` via `resolveAssetUrl` | Generated previews use public domain | |
| Convex Google Sheets | `packages/data-ops/convex/integrations/googleSheets.ts` | Server fetch uses `resolveAssetUrl` | Internal import reads same public URLs | |
| Docs | `R2_PUBLIC_DOMAIN_AUDIT.md` | This audit | Track infra + code rollout | Update after prod domain |

## Manual infra (required)

### 1. Convex env var

Set on the **testing** Convex deployment:

```bash
cd packages/data-ops
npx convex env set R2_PUBLIC_BASE_URL https://assets-testing.getstage.co
```

Verify:

```bash
npx convex env get R2_PUBLIC_BASE_URL
```

Redeploy / restart `convex dev` after setting.

### 2. R2 custom domain (Cloudflare dashboard)

Bucket: `assetsgetstage-testing`

- Custom domain: `assets-testing.getstage.co`
- DNS: managed in same Cloudflare zone (R2 connects automatically)

### 3. Cache rule (Cloudflare dashboard)

**Caching → Cache Rules → Create rule**

| Field | Value |
|-------|-------|
| Rule name | `R2 assets testing cache` |
| When | Hostname equals `assets-testing.getstage.co` |
| Cache eligibility | Eligible for cache |
| Edge TTL | **Ignore cache-control header and use this TTL** → **7 days** (604800 seconds) |
| Browser TTL | **Override origin** → **1 day** (86400 seconds) — optional but fine for testing |

Optional: **Speed → Optimization → Tiered Cache** enabled on the zone.

Public R2 custom-domain objects are cacheable at the edge; stable URLs (no per-request signatures) allow cache hits.

### 4. Smoke test

After env + deploy:

1. Run a **new** moodboard Refero import.
2. Open DevTools → image request host must be `assets-testing.getstage.co` (not `r2.cloudflarestorage.com`).
3. Reload page → second request should show `(disk cache)` or `cf-cache-status: HIT`.
4. Old broken legacy keys may still 404 — re-import only if needed.

## Verification

| Check | Result | Notes |
|-------|--------|-------|
| `pnpm --dir packages/data-ops run convex:typecheck` | Passed | 2026-06-05 |
| `npx convex env set R2_PUBLIC_BASE_URL https://assets-testing.getstage.co` | Passed | Testing deployment |
| New upload resolves to custom domain | Manual | Restart `convex dev` + new Refero import |
| Cache HIT on reload | Manual | Requires cache rule in Cloudflare |

## Out of scope (this pass)

- Production domain (`assets.getstage.co` or similar)
- Migrating legacy artifact keys
- Style guide AI (`mode: styleguide`)
- Worker auth in front of public assets
