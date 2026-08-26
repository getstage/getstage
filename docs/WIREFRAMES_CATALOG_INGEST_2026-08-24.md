# Wireframes catalog ingest — n8n + Convex contract

> **Implementation record.** Last updated: **2026-08-25**.
> The broader ingest and retrieval rationale remains in [`WIREFRAMES_LIBRARY_INGEST.md`](./WIREFRAMES_LIBRARY_INGEST.md).

## Current state

- The n8n workflow `Wireframes Catalog Ingest — Kokonut` exists as a **Kokonut-only prototype**. It is not the final all-libraries workflow.
- The Cloudflare R2 S3 credential is configured manually in n8n. The workflow must reuse the existing Stage bucket by placing the existing `R2_BUCKET` value in the S3 node's **Bucket Name** field.
- A live Kokonut registry item has been uploaded to the testing R2 bucket at the documented key with `application/json` metadata.
- The minimal Convex catalog table, idempotent mutation, and authenticated ingest route are implemented. The testing secret and matching n8n credential still need to be configured before the complete registry run.
- Stage verification, embeddings, vector search, and generate-time RAG are separate later phases.

## Correct ingest order

```text
Registry / GitHub
  → n8n fetches one registry item
  → n8n uploads the raw item to the existing private Stage R2 bucket
  → n8n confirms that the R2 object exists
  → n8n POSTs the searchable metadata and R2 key to Convex
```

Convex does not proxy the file upload. R2 stores the source; Convex stores the index.

## R2 storage contract

Use the existing Stage R2 bucket and credentials:

- S3 endpoint: existing `R2_ENDPOINT`
- Region: `auto`
- Access key: existing `R2_ACCESS_KEY_ID`
- Secret key: existing `R2_SECRET_ACCESS_KEY`
- Bucket Name: existing `R2_BUCKET`
- ACL: private
- `R2_TOKEN` is not used by the n8n S3 node.

Object key:

```text
catalog/libraries/<libraryId>/<componentName>/<sourceRevision>/registry-item.json
```

The raw registry item is stored as JSON. It already contains `files[]`, CSS, npm dependencies, registry dependencies, and other upstream facts. Do not split those fields into separate R2 objects during the first ingest.

`sourceRevision` must eventually be an upstream version or content hash. The prototype's fixed `v1` value is acceptable only for the first upload smoke test because later upstream changes would overwrite the same object.

### Upload success gate

Before the Convex upsert:

1. Upload the object with the S3 node.
2. Read or download the same key from R2.
3. Confirm that the object exists and contains valid JSON.
4. Continue to Convex only after that check succeeds.

This prevents Convex rows from pointing at missing R2 objects.

## Convex implementation required now

Add a focused `wireframeCatalogComponents` table in `packages/data-ops/convex/schema.ts`:

```ts
wireframeCatalogComponents: defineTable({
  componentId: v.string(),
  library: v.string(),
  name: v.string(),
  kind: v.string(),
  sourceRevision: v.string(),
  sourceBundleKey: v.string(),
  verified: v.boolean(),
  updatedAt: v.number(),
}).index("by_componentId", ["componentId"]),
```

Add:

- an idempotent internal mutation keyed by `componentId`;
- `POST /ingest/catalog/upsert` in `convex/http.ts`;
- shared-secret authentication using `x-ingest-token`;
- Convex environment variable `WIREFRAMES_INGEST_TOKEN`.

The n8n ingest request sends:

```json
{
  "componentId": "kokonut-ui/particle-button",
  "library": "kokonut-ui",
  "name": "particle-button",
  "kind": "registry:component",
  "sourceRevision": "<upstream-version-or-content-hash>",
  "sourceBundleKey": "catalog/libraries/kokonut-ui/particle-button/<revision>/registry-item.json"
}
```

Convex, not n8n, sets `verified: false` and `updatedAt`. Re-ingest must never downgrade an already verified row.

The endpoint URL is on the Convex site origin:

```text
Testing:    https://reliable-bullfrog-917.convex.site/ingest/catalog/upsert
Production: https://quirky-snail-763.convex.site/ingest/catalog/upsert
```

## All-libraries n8n workflow

After the single-item R2 + Convex smoke test passes, rename the workflow to `Wireframes Catalog Ingest — All Libraries` and add source adapters:

| Adapter | Libraries |
|---------|-----------|
| Standard shadcn registry | Kokonut UI, Magic UI, Origin UI, supported shadcn registries |
| React Bits GitHub registry | React Bits `*-TS-TW` items with unique-name normalization |
| Source-specific adapter | Libraries without a compatible registry; only when executable source is available |

Do not treat one configurable URL as sufficient for every library. React Bits and non-registry sources have different discovery and item URL rules.

Keep the weekly schedule disabled until:

1. one component completes R2 upload, R2 read-back, and Convex upsert;
2. a complete Kokonut run succeeds;
3. each additional adapter succeeds independently;
4. rerunning the workflow updates rows without duplication.

## Later phases

### Stage verification

Stage downloads the R2 bundle, resolves file dependencies, typechecks it, and fixture-renders it. Only Stage can set `verified: true`; failures remain unverified and record an error.

### Embeddings and RAG

After verification works:

1. add retrieval metadata and the fixed-dimension embedding field;
2. add the Convex vector index;
3. backfill embeddings without re-uploading R2 objects;
4. hard-filter by selected library, verification, runtime, and compatibility;
5. retrieve only a few matching bundles during generation.

Embeddings and RAG are not part of the current ingest completion gate.
