/**
 * Wireframe component catalog transport.
 * Logic: `lib/wireframeCatalog/handlers/*`.
 */
import {
  action,
  httpAction,
  internalAction,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import {
  getCatalogComponentArgs,
  getCatalogComponentHandler,
  getCatalogComponentsArgs,
  getCatalogComponentsHandler,
  getCatalogEmbeddingsArgs,
  getCatalogEmbeddingsHandler,
  ingestCatalogComponentHandler,
  indexCatalogBatchArgs,
  indexCatalogBatchHandler,
  indexCatalogComponentArgs,
  indexCatalogComponentHandler,
  listCatalogComponentsForIndexingArgs,
  listCatalogComponentsForIndexingHandler,
  loadCatalogSourceArgs,
  loadCatalogSourceHandler,
  markCatalogIndexFailureArgs,
  markCatalogIndexFailureHandler,
  searchCatalogArgs,
  searchCatalogHandler,
  upsertCatalogEmbeddingArgs,
  upsertCatalogEmbeddingHandler,
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

export const getCatalogComponent = internalQuery({
  args: getCatalogComponentArgs,
  handler: getCatalogComponentHandler,
});

export const getCatalogComponents = internalQuery({
  args: getCatalogComponentsArgs,
  handler: getCatalogComponentsHandler,
});

export const getCatalogEmbeddings = internalQuery({
  args: getCatalogEmbeddingsArgs,
  handler: getCatalogEmbeddingsHandler,
});

export const listCatalogComponentsForIndexing = internalQuery({
  args: listCatalogComponentsForIndexingArgs,
  handler: listCatalogComponentsForIndexingHandler,
});

export const upsertCatalogEmbedding = internalMutation({
  args: upsertCatalogEmbeddingArgs,
  handler: upsertCatalogEmbeddingHandler,
});

export const markCatalogIndexFailure = internalMutation({
  args: markCatalogIndexFailureArgs,
  handler: markCatalogIndexFailureHandler,
});

export const indexCatalogComponent = internalAction({
  args: indexCatalogComponentArgs,
  handler: indexCatalogComponentHandler,
});

export const indexCatalogBatch = internalAction({
  args: indexCatalogBatchArgs,
  handler: indexCatalogBatchHandler,
});

export const searchCatalog = action({
  args: searchCatalogArgs,
  handler: searchCatalogHandler,
});

export const loadCatalogSource = action({
  args: loadCatalogSourceArgs,
  handler: loadCatalogSourceHandler,
});
