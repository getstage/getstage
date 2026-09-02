"use node";

import { embed } from "ai";
import { v } from "convex/values";
import { traceable } from "langsmith/traceable";
import { internalAction } from "./_generated/server";
import {
  CATALOG_EMBEDDING_DIMENSION,
  DEFAULT_EMBEDDING_MODEL,
  embeddingModel,
} from "./lib/wireframeCatalog/embedding";

const DEFAULT_LANGSMITH_PROJECT = "stage-wireframes-rag";
const MAX_EMBEDDING_INPUT_CHARACTERS = 24_000;

export const embedCatalogText = internalAction({
  args: {
    value: v.string(),
    correlationId: v.string(),
    operation: v.union(v.literal("index"), v.literal("search")),
  },
  handler: async (_ctx, args) => {
    if (
      !args.value.trim() ||
      args.value.length > MAX_EMBEDDING_INPUT_CHARACTERS
    ) {
      throw new Error("Embedding input must contain 1-24000 characters.");
    }
    if (!/^[a-zA-Z0-9:_-]{1,128}$/.test(args.correlationId)) {
      throw new Error("Invalid embedding correlation ID.");
    }
    if (!process.env.NEBIUS_API_KEY?.trim()) {
      throw new Error("NEBIUS_API_KEY is not configured.");
    }

    const langsmithEnabled = Boolean(process.env.LANGSMITH_API_KEY?.trim());
    const createEmbedding = async () => {
      const result = await embed({
        model: embeddingModel(),
        value: args.value,
        maxRetries: 2,
        providerOptions: {
          nebius: { dimensions: CATALOG_EMBEDDING_DIMENSION },
        },
      });
      return {
        embedding: result.embedding,
        tokens: result.usage.tokens,
      };
    };
    const result = langsmithEnabled
      ? await traceable(createEmbedding, {
          name: "wireframes-rag-embedding",
          run_type: "embedding",
          project_name:
            process.env.LANGSMITH_PROJECT?.trim() ||
            DEFAULT_LANGSMITH_PROJECT,
          metadata: {
            correlationId: args.correlationId,
            operation: args.operation,
            embeddingModel:
              process.env.NEBIUS_EMBEDDING_MODEL?.trim() ||
              DEFAULT_EMBEDDING_MODEL,
          },
          tags: ["wireframes", "rag", "embedding"],
          tracingEnabled: true,
          processInputs: () => ({ recording: "disabled" }),
          processOutputs: (output) => ({
            dimensions: Array.isArray(output.embedding)
              ? output.embedding.length
              : 0,
            tokens: typeof output.tokens === "number" ? output.tokens : 0,
          }),
        })()
      : await createEmbedding();
    if (result.embedding.length !== CATALOG_EMBEDDING_DIMENSION) {
      throw new Error(
        `Embedding dimension mismatch: expected ${CATALOG_EMBEDDING_DIMENSION}, received ${result.embedding.length}.`,
      );
    }
    return result;
  },
});
