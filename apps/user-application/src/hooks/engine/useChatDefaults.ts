import { useCallback, useMemo, useSyncExternalStore } from "react";
import { useProviderStatus } from "@/hooks/engine/useProviderStatus";
import { chatModelsFromProviders } from "@/lib/engine/providerModels";

export type ChatProviderId = "favorites" | "openai" | "anthropic";

export type ChatModel = {
  id: string;
  label: string;
  provider: ChatProviderId;
  description: string;
  badge?: string;
};

export type ReasoningEffort = "low" | "medium" | "high" | "extra-high";
export type ResponseSpeed = "default" | "fast";

export type ReasoningEffortOption = {
  id: ReasoningEffort;
  label: string;
};

export type ResponseSpeedOption = {
  id: ResponseSpeed;
  label: string;
};

type ChatDefaultsState = {
  modelId: string;
  reasoningEffort: ReasoningEffort;
  responseSpeed: ResponseSpeed;
};

const STORAGE_KEY = "stage.chatDefaults.v1";
const CHANGE_EVENT = "stage:chat-defaults-changed";

export const chatModels: ChatModel[] = [
  {
    id: "claude-opus-5",
    label: "Claude Opus 5",
    provider: "anthropic",
    description: "Newest flagship Claude model",
    badge: "New",
  },
  {
    id: "claude-fable-5",
    label: "Claude Fable 5",
    provider: "anthropic",
    description: "Anthropic Fable 5 frontier model",
    badge: "New",
  },
  {
    id: "claude-sonnet-5",
    label: "Claude Sonnet 5",
    provider: "anthropic",
    description: "Newest balanced Claude model",
    badge: "New",
  },
  {
    id: "claude-opus-4.8",
    label: "Claude Opus 4.8",
    provider: "anthropic",
    description: "Previous flagship Claude",
  },
  {
    id: "claude-haiku-4.5",
    label: "Claude Haiku 4.5",
    provider: "anthropic",
    description: "Newest fast Claude model",
  },
  {
    id: "claude-sonnet-4.6",
    label: "Claude Sonnet 4.6",
    provider: "anthropic",
    description: "Previous balanced Claude model",
  },
  {
    id: "claude-opus-4.7",
    label: "Claude Opus 4.7",
    provider: "anthropic",
    description: "Previous flagship Claude",
  },
  {
    id: "gpt-5.6-sol",
    label: "GPT-5.6 Sol",
    provider: "openai",
    description: "Newest flagship OpenAI model",
    badge: "New",
  },
  {
    id: "gpt-5.6-terra",
    label: "GPT-5.6 Terra",
    provider: "openai",
    description: "Balanced GPT-5.6 for everyday work",
  },
  {
    id: "gpt-5.6-luna",
    label: "GPT-5.6 Luna",
    provider: "openai",
    description: "Fast, cost-efficient GPT-5.6",
  },
  {
    id: "gpt-5.5",
    label: "GPT-5.5",
    provider: "openai",
    description: "Newest flagship OpenAI model",
    badge: "New",
  },
  {
    id: "gpt-5.5-pro",
    label: "GPT-5.5 Pro",
    provider: "openai",
    description: "Top OpenAI deep work model",
  },
  {
    id: "gpt-5.4",
    label: "GPT-5.4",
    provider: "openai",
    description: "Previous frontier model",
  },
];

export const reasoningEfforts: ReasoningEffortOption[] = [
  { id: "low", label: "Low" },
  { id: "medium", label: "Medium" },
  { id: "high", label: "High" },
  { id: "extra-high", label: "Extra High" },
];

export const responseSpeeds: ResponseSpeedOption[] = [
  { id: "default", label: "Default" },
  { id: "fast", label: "Fast" },
];

export const DEFAULT_CHAT_DEFAULTS: ChatDefaultsState = {
  modelId: "gpt-5.5",
  reasoningEffort: "medium",
  responseSpeed: "default",
};

export function getChatModelById(modelId: string, models: ChatModel[] = chatModels) {
  return models.find((model) => model.id === modelId) ?? models[0] ?? chatModels[0]!;
}

export function useAvailableChatModels() {
  const providers = useProviderStatus();

  return useMemo(() => {
    const fromProviders = chatModelsFromProviders(providers.providerList.providers);
    return fromProviders.length > 0 ? fromProviders : chatModels;
  }, [providers.providerList.providers]);
}

function isReasoningEffort(value: unknown): value is ReasoningEffort {
  return reasoningEfforts.some((effort) => effort.id === value);
}

function isResponseSpeed(value: unknown): value is ResponseSpeed {
  return responseSpeeds.some((speed) => speed.id === value);
}

function readChatDefaults(availableModelIds: string[]): ChatDefaultsState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CHAT_DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<ChatDefaultsState>;

    return {
      modelId: availableModelIds.includes(parsed.modelId ?? "")
        ? parsed.modelId!
        : availableModelIds.includes(DEFAULT_CHAT_DEFAULTS.modelId)
          ? DEFAULT_CHAT_DEFAULTS.modelId
          : (availableModelIds[0] ?? DEFAULT_CHAT_DEFAULTS.modelId),
      reasoningEffort: isReasoningEffort(parsed.reasoningEffort)
        ? parsed.reasoningEffort
        : DEFAULT_CHAT_DEFAULTS.reasoningEffort,
      responseSpeed: isResponseSpeed(parsed.responseSpeed)
        ? parsed.responseSpeed
        : DEFAULT_CHAT_DEFAULTS.responseSpeed,
    };
  } catch {
    return DEFAULT_CHAT_DEFAULTS;
  }
}

function writeChatDefaults(defaults: ChatDefaultsState) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribeToChatDefaults(listener: () => void) {
  function handleStorage(event: StorageEvent) {
    if (event.key === STORAGE_KEY) {
      listener();
    }
  }

  window.addEventListener(CHANGE_EVENT, listener);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(CHANGE_EVENT, listener);
    window.removeEventListener("storage", handleStorage);
  };
}

function createChatDefaultsStore(availableModelIds: string[]) {
  return {
    read: () => readChatDefaults(availableModelIds),
    snapshot: () => JSON.stringify(readChatDefaults(availableModelIds)),
  };
}

export function useChatDefaults() {
  const availableModels = useAvailableChatModels();
  const availableModelIds = useMemo(
    () => availableModels.map((model) => model.id),
    [availableModels],
  );
  const defaultsStore = useMemo(
    () => createChatDefaultsStore(availableModelIds),
    [availableModelIds],
  );

  const defaultsSnapshot = useSyncExternalStore(
    subscribeToChatDefaults,
    defaultsStore.snapshot,
    () => JSON.stringify(DEFAULT_CHAT_DEFAULTS),
  );
  const defaults = useMemo(
    () => JSON.parse(defaultsSnapshot) as ChatDefaultsState,
    [defaultsSnapshot],
  );

  const setDefaults = useCallback(
    (nextDefaults: Partial<ChatDefaultsState>) => {
      writeChatDefaults({
        ...defaultsStore.read(),
        ...nextDefaults,
      });
    },
    [defaultsStore],
  );

  return useMemo(
    () => ({
      defaults,
      availableModels,
      selectedModel: getChatModelById(defaults.modelId, availableModels),
      selectedEffort: defaults.reasoningEffort,
      selectedSpeed: defaults.responseSpeed,
      setDefaults,
    }),
    [availableModels, defaults, setDefaults],
  );
}
