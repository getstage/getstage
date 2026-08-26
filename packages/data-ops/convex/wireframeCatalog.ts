/**
 * Wireframe component catalog transport.
 * Logic: `lib/wireframeCatalog/handlers/*`.
 */
import { httpAction, internalMutation } from "./_generated/server";
import {
  ingestCatalogComponentHandler,
  upsertCatalogComponentArgs,
  upsertCatalogComponentHandler,
  upsertCatalogComponentReturns,
} from "./lib/wireframeCatalog/handlers";

export const upsertCatalogComponent = internalMutation({
  args: upsertCatalogComponentArgs,
  returns: upsertCatalogComponentReturns,
  handler: upsertCatalogComponentHandler,
});

export const ingestCatalogComponent = httpAction(ingestCatalogComponentHandler);
