# macOS download and trial credits setup

Quick-reference for the web download page and trial credit cap. Updated 2026-07-08.

## macOS download (web)

**Route:** `/download/mac` (authenticated)  
**Code:** `apps/web-application/src/routes/download.mac.tsx`  
**Helper:** `apps/web-application/src/lib/macosDownload.ts`

### Behaviour

1. User clicks **Download for macOS**.
2. Client detects CPU architecture (Apple Silicon vs Intel) via WebGL renderer heuristics.
3. Browser opens the matching GitHub release asset:
   - Apple Silicon → `Stage-arm64.dmg`
   - Intel → `Stage-x64.dmg`

Asset URLs use GitHub’s latest-release shortcut (no hard-coded version tag):

```
https://github.com/getstage/getstage/releases/latest/download/Stage-arm64.dmg
https://github.com/getstage/getstage/releases/latest/download/Stage-x64.dmg
```

If detection is uncertain, **arm64** is used (fallback). An **Intel Mac** text link is shown under the primary button.

### Release requirements

Each desktop GitHub release must include both DMG assets (see `getstage/getstage` releases, e.g. v0.2.9):

| Asset | Audience |
|-------|----------|
| `Stage-arm64.dmg` | Apple Silicon (M1/M2/M3/M4…) |
| `Stage-x64.dmg` | Intel Mac |

Optional: `latest-mac.yml` for electron-updater (desktop auto-update) — separate from the web download button.

### Manual QA

- [ ] On Apple Silicon Mac: primary button downloads `Stage-arm64.dmg`
- [ ] On Intel Mac (or via “Intel Mac” link): downloads `Stage-x64.dmg`
- [ ] Logged-out user is redirected to `/auth?redirect=/download/mac`
- [ ] New GitHub release publishes both DMGs without changing web code

---

## Trial credits

**Source of truth:** `packages/data-ops/convex/lib/credits/priceConfig.ts`

```ts
export const TRIAL_CREDIT_CAP = 150;
```

**Granted when:** Stripe `checkout.session.completed` for a subscription checkout with trial metadata (`packages/data-ops/convex/lib/billing/handlers/webhooks.ts`).

### Product rules

| Item | Value |
|------|-------|
| Trial length | 14 days (`TRIAL_DAYS` in billing handlers) |
| Trial credit cap | **150** credits (hard cap until trial converts) |
| Card required | Yes |
| Existing wallets | Not retroactively changed; only new trial checkouts get 150 |

### Manual QA

- [ ] Start trial (Stripe test mode) → wallet shows 150 credits
- [ ] Usage beyond 150 during trial → `insufficient_credits` / paywall as designed
- [ ] After trial converts → full tier monthly grant (Start 5,000 / Pro 10,000 / Team 18,000)

### Deploy note

Changing `TRIAL_CREDIT_CAP` requires a **Convex deploy** (`packages/data-ops`). Web-only deploy does not update billing grants.

---

## Related work (not in this change)

| Issue | Status | Notes |
|-------|--------|-------|
| Wireframes checkboxes stuck | Planned | `ConfigureStep.tsx` disables `required` screens |
| Figma export pairing expired | Planned | 10-minute TTL in `stage-engine` |
| Moodboard images disappear | Planned | R2 key persistence / Refero upload reliability |

See conversation plan or `PROJECT_STATUS.md` for prioritisation.
