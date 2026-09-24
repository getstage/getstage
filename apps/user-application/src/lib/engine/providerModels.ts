import type { ProviderId, ProviderModel, ProviderStatusRecord } from "@stage/data-ops/contracts";
import type { ChatModel, ChatProviderId } from "@/hooks/engine/useChatDefaults";

function providerIdToChatProvider(providerId: ProviderId): ChatProviderId {
  return providerId === "claude" ? "anthropic" : "openai";
}

const SAFE_MODEL_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

function isSafeProviderModel(model: ProviderModel): boolean {
  return (
    SAFE_MODEL_ID.test(model.id) &&
    !model.id.includes("..") &&
    model.label.trim().length > 0 &&
    model.label.length <= 80
  );
}

export function providerModelToChatModel(model: ProviderModel, providerId: ProviderId): ChatModel {
  return {
    id: model.id,
    label: model.label,
    provider: providerIdToChatProvider(providerId),
  };
}

export function chatModelsFromProviders(
  providers: ProviderStatusRecord[] | undefined,
): ChatModel[] {
  if (!providers?.length) {
    return [];
  }

  return providers.flatMap((provider) =>
    provider.models
      .filter(isSafeProviderModel)
      .map((model) => providerModelToChatModel(model, provider.id))
      .sort((left, right) => compareModelsNewestFirst(left.id, right.id, provider.id)),
  );
}

function compareModelsNewestFirst(left: string, right: string, providerId: ProviderId) {
  const family = modelFamilyRank(left, providerId) - modelFamilyRank(right, providerId);
  if (family !== 0) return family;
  const leftVersion = versionParts(left);
  const rightVersion = versionParts(right);
  const length = Math.max(leftVersion.length, rightVersion.length);
  for (let index = 0; index < length; index += 1) {
    const diff = (rightVersion[index] ?? 0) - (leftVersion[index] ?? 0);
    if (diff !== 0) return diff;
  }
  return left.localeCompare(right);
}

function modelFamilyRank(label: string, providerId: ProviderId) {
  const lower = label.toLowerCase();
  if (providerId === "claude") {
    const families = ["fable", "opus", "sonnet", "haiku"];
    const index = families.findIndex((family) => lower.includes(family));
    return index === -1 ? families.length : index;
  }
  if (lower.includes("codex")) return 1;
  if (lower.includes("gpt")) return 0;
  return 2;
}

function versionParts(id: string) {
  const parts = id
    .split(/[^0-9]+/)
    .filter((part) => part.length > 0 && part.length < 4)
    .map((part) => Number(part));
  return parts.length > 0 ? parts : [0];
}

export function getDefaultModelIdFromProviders(
  providers: ProviderStatusRecord[] | undefined,
): string | null {
  const preferred = providers
    ?.flatMap((provider) => provider.models.filter(isSafeProviderModel))
    .find((model) => model.isDefault);
  if (preferred) {
    return preferred.id;
  }

  const models = chatModelsFromProviders(providers);
  return models.find((model) => model.id === "gpt-5.5")?.id ?? models[0]?.id ?? null;
}
