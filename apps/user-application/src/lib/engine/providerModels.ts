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
      .map((model) => providerModelToChatModel(model, provider.id)),
  );
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
