# R2 Migration Fixes — Updated 9 March 2026

## Waarom R2?

Convex heeft ingebouwde file storage (`ctx.storage`), maar we migreren naar Cloudflare R2 voor meer controle, goedkopere opslag, en eigen domein/CDN.

---

## KRITIEKE REGEL: Altijd DELETE → UPLOAD → DB UPDATE

**Bij elk R2 bestand dat vervangen wordt (avatar, logo, attachment) geldt:**

1. **DELETE** het oude R2 object (via `deleteOldR2Asset`)
2. **UPLOAD** het nieuwe bestand naar R2
3. **UPDATE** de DB met de nieuwe key

**Waarom?** Anders krijg je ghost data — oude bestanden die in R2 blijven staan maar nergens meer naar verwezen wordt. Kost geld, maakt bucket vies.

**Implementatie:**
- `convex/r2.ts` exporteert `deleteOldR2Asset(ctx, oldValue)` — checkt of de waarde een R2 key is (geen URL, geen data URI), en verwijdert het object. Best-effort (catch errors).
- `convex/settings.ts` → `updateProfile` deletet de oude `user.avatarUrl` R2 key voordat de nieuwe wordt opgeslagen.
- `convex/settings.ts` → `updatePortalBranding` deletet de oude `user.defaultPortalLogoUrl` R2 key voordat de nieuwe wordt opgeslagen.

```ts
// convex/r2.ts
export async function deleteOldR2Asset(ctx: MutationCtx, oldValue: string | null | undefined) {
  if (!oldValue || !isR2Key(oldValue)) return;
  try {
    await r2.deleteObject(ctx, oldValue);
  } catch {
    // Best-effort: object may already be gone.
  }
}
```

```ts
// convex/settings.ts — updateProfile handler
if (nextAvatarUrl !== undefined && user.avatarUrl) {
  await deleteOldR2Asset(ctx, user.avatarUrl);
}

// convex/settings.ts — updatePortalBranding handler
if (nextLogoUrl !== undefined && user.defaultPortalLogoUrl) {
  await deleteOldR2Asset(ctx, user.defaultPortalLogoUrl);
}
```

---

## Alle fixes — Status

| # | Bestand | Wat | Status |
|---|---------|-----|--------|
| 1 | `convex/_helpers.ts` | Domein → `SITE_URL` env var | ✅ Done |
| 2 | `SettingsPage.tsx` | CSV upload → R2 | ✅ Done (9 maart) |
| 3 | `TaskDetailPage.tsx` | Attachments → R2 | ✅ Done (9 maart) |
| 4 | `OnboardingModal.tsx` | Unused prop weg | ✅ Done |
| 5 | `SettingsPage.tsx` | Avatar save → R2 via `prepareAvatarUpload` + `uploadFileToR2` + `avatarKey` | ✅ Done (9 maart) |
| 6 | `SettingsPage.tsx` | Portal logo save → R2 via `preparePortalLogoUpload` + `uploadFileToR2` + `logoKey` | ✅ Done (9 maart) |
| 7 | `convex/r2.ts` | `deleteOldR2Asset` helper — delete oud object voor nieuw wordt opgeslagen | ✅ Done (9 maart) |
| 8 | `convex/settings.ts` | `updateProfile` + `updatePortalBranding` → delete oude R2 key eerst | ✅ Done (9 maart) |
| 9 | `IntegrationsTab.tsx` | CSV upload sectie verwijderd uit Settings | ✅ Done (9 maart) |
| 10 | `convex/billing.ts` | 409 idempotency fix voor Loops welcome email | ✅ Done (9 maart) |

---

## R2 upload flow — Referentie

### Frontend (`src/lib/r2Uploads.ts`)

```
Gebruiker selecteert bestand
  → prepareAvatarUpload / preparePortalLogoUpload (convert naar webp, preview URL)
  → uploadFileToR2({ generateUploadUrl, syncMetadata, purpose, file })
      1. Validatie (size, type)
      2. generateUploadUrl mutation → signed URL + key
      3. PUT naar R2 signed URL
      4. syncMetadata mutation → metadata in Convex
      5. return key
```

### Backend (`convex/r2.ts` + `convex/settings.ts`)

```
updateProfile / updatePortalBranding mutation:
  1. deleteOldR2Asset(ctx, user.avatarUrl)    ← DELETE oud
  2. patch DB met nieuwe key                   ← UPDATE DB
  3. resolveAssetUrl voor response             ← RETURN URL
```

### Purposes

| Purpose | Frontend prepare | R2 path |
|---------|-----------------|---------|
| `profile-avatar` | `prepareAvatarUpload` → webp | `users/{id}/profile/avatar-{uuid}.webp` |
| `portal-logo` | `preparePortalLogoUpload` → webp/svg | `users/{id}/portal/logo-{uuid}.{ext}` |
| `task-attachment` | direct | `users/{id}/task-attachments/{uuid}.{ext}` |
| `csv-upload` | direct | `users/{id}/imports/{uuid}.csv` |
