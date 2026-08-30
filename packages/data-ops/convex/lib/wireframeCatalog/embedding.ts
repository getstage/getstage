import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export const CATALOG_EMBEDDING_DIMENSION = 4096;
const NEBIUS_BASE_URL = "https://api.tokenfactory.nebius.com/v1";
export const DEFAULT_EMBEDDING_MODEL = "Qwen/Qwen3-Embedding-8B";

export function embeddingModel() {
  return createOpenAICompatible({
    name: "nebius",
    apiKey: process.env.NEBIUS_API_KEY?.trim(),
    baseURL: NEBIUS_BASE_URL,
  }).embeddingModel(
    process.env.NEBIUS_EMBEDDING_MODEL?.trim() || DEFAULT_EMBEDDING_MODEL,
  );
}

export function catalogScopes(
  libraries: string[],
  runtime: "client" | "universal",
) {
  return libraries.flatMap((library) =>
    runtime === "client"
      ? [`${library}:client`, `${library}:universal`]
      : [`${library}:universal`],
  );
}
