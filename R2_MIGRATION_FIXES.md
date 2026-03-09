# R2 Migration — 4 Remaining Fixes

## Waarom R2?

Convex heeft ingebouwde file storage (`ctx.storage`), maar jullie migreren naar Cloudflare R2 voor meer controle, goedkopere opslag, en eigen domein/CDN.

De backend (Convex) is **al klaar** voor R2:
- `convex/r2.ts` — R2 client, `generateUploadUrl`, `syncMetadata`
- `convex/tasks.ts` — `saveAttachment` verwacht nu `r2ObjectKey` (niet meer `storageId`)
- `convex/googleSheets.ts` — `uploadCsv` verwacht nu `r2ObjectKey` (niet meer `storageId`)
- De oude `generateUploadUrl` functies in tasks.ts en googleSheets.ts gooien expres een error: `"Use api.r2.generateUploadUrl instead."`

De frontend helper is **ook al klaar**:
- `src/lib/r2Uploads.ts` — `uploadFileToR2()` doet het hele upload-verhaal (validatie → signed URL ophalen → PUT naar R2 → metadata syncen)

**Maar:** de twee pagina's die uploaden (SettingsPage + TaskDetailPage) roepen nog steeds de **oude** Convex storage flow aan. Dat is waarom typecheck faalt.

---

## Fix 1: `convex/_helpers.ts` lijn 6 — Hardcoded domein

**Was:** `const PORTAL_BASE_URL = "https://app.usestage.com";`

**Probleem:** Oud domein. Portal share-URLs worden hiermee gebouwd en in de DB opgeslagen.

**Fix:** Gebruik `SITE_URL` environment variable (zelfde pattern als `billing.ts` en `stripeConnect.ts` al doen):
```ts
const PORTAL_BASE_URL = getEnv("SITE_URL") ?? "https://getstage.co";
```

**Status:** ✅ Al gefixed

---

## Fix 2: `src/components/settings/SettingsPage.tsx` — CSV upload

**Was (lijn 427-448):**
```ts
const uploadUrl = await generateUploadUrl({});          // ← oude Convex storage
const response = await fetch(uploadUrl, { method: "POST", ... });
const body = await response.json() as { storageId?: string };
await uploadCsv({ storageId: body.storageId as never, fileName: file.name });
```

**Probleem:**
- `generateUploadUrl` (van `api.googleSheets.generateUploadUrl`) gooit nu een error
- `uploadCsv` verwacht `r2ObjectKey`, niet `storageId`

**Fix:** Gebruik `uploadFileToR2` uit `r2Uploads.ts`:
```ts
import { uploadFileToR2 } from "@/lib/r2Uploads";

// mutations:
const r2GenerateUploadUrl = useConvexMutation(api.r2.generateUploadUrl);
const r2SyncMetadata = useConvexMutation(api.r2.syncMetadata);

// in handleCsvFileChange:
const key = await uploadFileToR2({
  generateUploadUrl: r2GenerateUploadUrl,
  syncMetadata: r2SyncMetadata,
  purpose: "csv-upload",
  file,
});
await uploadCsv({ r2ObjectKey: key, fileName: file.name });
```

**Status:** ❌ Nog niet gefixed

---

## Fix 3: `src/components/task/TaskDetailPage.tsx` — Bestandsbijlagen

**Was (lijn 117-134):**
```ts
const uploadUrl = await generateUploadUrl({});          // ← oude Convex storage
const uploadResult = await fetch(uploadUrl, { method: "POST", ... });
const { storageId } = await uploadResult.json();
await saveAttachment({ taskId, storageId, fileName, fileSize, mimeType });
```

**Probleem:**
- `generateUploadUrl` (van `api.tasks.generateUploadUrl`) gooit nu een error
- `saveAttachment` verwacht `r2ObjectKey`, niet `storageId`

**Fix:** Zelfde pattern:
```ts
import { uploadFileToR2, getNormalizedMimeType } from "@/lib/r2Uploads";

// mutations:
const r2GenerateUploadUrl = useConvexMutation(api.r2.generateUploadUrl);
const r2SyncMetadata = useConvexMutation(api.r2.syncMetadata);

// in handleFiles:
for (const file of Array.from(files)) {
  const key = await uploadFileToR2({
    generateUploadUrl: r2GenerateUploadUrl,
    syncMetadata: r2SyncMetadata,
    purpose: "task-attachment",
    file,
  });
  await saveAttachment({
    taskId: taskId as Id<"tasks">,
    r2ObjectKey: key,
    fileName: file.name,
    fileSize: file.size,
    mimeType: getNormalizedMimeType(file),
  });
}
```

**Status:** ❌ Nog niet gefixed

---

## Fix 4: `src/components/onboarding/OnboardingModal.tsx` lijn 156 — Unused prop

**Was:** `stripeGuideHref` staat in de type + destructuring maar wordt nergens in de component gebruikt.

**Fix:** Verwijder uit type en destructuring.

**Status:** ✅ Al gefixed

---

## Samenvatting

| # | Bestand | Wat | Status |
|---|---------|-----|--------|
| 1 | `convex/_helpers.ts` | Domein → `SITE_URL` env var | ✅ Done |
| 2 | `SettingsPage.tsx` | CSV upload → R2 | ❌ Todo |
| 3 | `TaskDetailPage.tsx` | Attachments → R2 | ❌ Todo |
| 4 | `OnboardingModal.tsx` | Unused prop weg | ✅ Done |

Na deze 4 fixes zou `pnpm typecheck` moeten slagen.
