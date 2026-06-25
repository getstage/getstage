import type { ProviderId, ProviderModel, ProviderStatusRecord } from "@stage/data-ops/contracts";
import type { ChatModel, ChatProviderId } from "@/hooks/engine/useChatDefaults";

function providerIdToChatProvider(providerId: ProviderId): ChatProviderId {
  return providerId === "claude" ? "anthropic" : "openai";
}

export function providerModelToChatModel(model: ProviderModel, providerId: ProviderId): ChatModel {
  return {
    id: model.id,
    label: model.label,
    provider: providerIdToChatProvider(providerId),
    description:
      model.source === "provider"
        ? "Reported by your local provider"
        : providerId === "claude" ? "Claude model" : "OpenAI model",
    badge: model.source === "provider" && model.isDefault ? "Live" : undefined,
  };
}

export function chatModelsFromProviders(
  providers: ProviderStatusRecord[] | undefined,
): ChatModel[] {
  if (!providers?.length) {
    return [];
  }

  return providers.flatMap((provider) =>
    provider.models.map((model) => providerModelToChatModel(model, provider.id)),
  );
}

export function getDefaultModelIdFromProviders(
  providers: ProviderStatusRecord[] | undefined,
): string | null {
  const models = chatModelsFromProviders(providers);
  return models.find((model) => model.id === "gpt-5.5")?.id ?? models[0]?.id ?? null;
}
