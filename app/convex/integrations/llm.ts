import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

const DEFAULT_STAGE_PROJECT_GENERATION_MODEL = "anthropic:claude-sonnet-4-20250514";

type SupportedProvider = "anthropic" | "openai" | "google" | "gateway";

function getEnv(name: string) {
  return (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.[
    name
  ];
}

function requireEnv(name: string, description?: string) {
  const value = getEnv(name)?.trim();
  if (!value) {
    throw new Error(description ?? `${name} is not configured.`);
  }
  return value;
}

function normalizeRequestedModel(model: string | undefined) {
  const trimmed = model?.trim();
  if (trimmed) {
    return trimmed;
  }

  const configured = getEnv("STAGE_PROJECT_GENERATION_MODEL")?.trim();
  if (configured) {
    return configured;
  }

  const legacyAnthropic = getEnv("ANTHROPIC_MODEL")?.trim();
  if (legacyAnthropic) {
    return `anthropic:${legacyAnthropic}`;
  }

  return DEFAULT_STAGE_PROJECT_GENERATION_MODEL;
}

function splitModelSpec(modelSpec: string) {
  if (modelSpec.includes("/") && !modelSpec.includes(":")) {
    return {
      provider: "gateway" as const,
      modelId: modelSpec,
      normalizedSpec: modelSpec,
    };
  }

  const separatorIndex = modelSpec.indexOf(":");
  if (separatorIndex === -1) {
    throw new Error(
      "Unsupported model format. Use anthropic:<model>, openai:<model>, google:<model>, or gateway:<provider/model>.",
    );
  }

  const rawProvider = modelSpec.slice(0, separatorIndex).trim().toLowerCase();
  const modelId = modelSpec.slice(separatorIndex + 1).trim();

  if (!modelId) {
    throw new Error("Model ID is required.");
  }

  switch (rawProvider) {
    case "anthropic":
    case "claude":
      return {
        provider: "anthropic" as const,
        modelId,
        normalizedSpec: `anthropic:${modelId}`,
      };
    case "openai":
    case "chatgpt":
      return {
        provider: "openai" as const,
        modelId,
        normalizedSpec: `openai:${modelId}`,
      };
    case "google":
    case "gemini":
      return {
        provider: "google" as const,
        modelId,
        normalizedSpec: `google:${modelId}`,
      };
    case "gateway":
      return {
        provider: "gateway" as const,
        modelId,
        normalizedSpec: `gateway:${modelId}`,
      };
    default:
      throw new Error(
        `Unsupported model provider '${rawProvider}'. Use anthropic, openai, google, or gateway.`,
      );
  }
}

function resolveProviderModel(provider: SupportedProvider, modelId: string): LanguageModel {
  switch (provider) {
    case "anthropic":
      requireEnv("ANTHROPIC_API_KEY", "ANTHROPIC_API_KEY is required for Anthropic models.");
      return anthropic(modelId);
    case "openai":
      requireEnv("OPENAI_API_KEY", "OPENAI_API_KEY is required for OpenAI models.");
      return openai(modelId);
    case "google":
      requireEnv(
        "GOOGLE_GENERATIVE_AI_API_KEY",
        "GOOGLE_GENERATIVE_AI_API_KEY is required for Google Gemini models.",
      );
      return google(modelId);
    case "gateway":
      requireEnv("AI_GATEWAY_API_KEY", "AI_GATEWAY_API_KEY is required for gateway models.");
      return modelId as LanguageModel;
  }
}

export function resolveProjectGenerationModel(model: string | undefined) {
  const normalized = normalizeRequestedModel(model);
  const parsed = splitModelSpec(normalized);

  return {
    provider: parsed.provider,
    modelId: parsed.modelId,
    modelSpec: parsed.normalizedSpec,
    model: resolveProviderModel(parsed.provider, parsed.modelId),
  };
}
