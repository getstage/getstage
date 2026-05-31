import { FormEvent, MouseEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CompanionState } from "@shared/models/desktop";
import type { ProviderId, RunEvent } from "@stage/data-ops/contracts";
import { useProviderPreferences } from "@/hooks/engine/useProviderPreferences";
import { useProviderRun } from "@/hooks/engine/useProviderRun";
import { useDraggablePanel } from "@/hooks/companion/useDraggablePanel";

type ChatMessage = {
  id: string;
  role: "user" | "stage";
  content: string[];
  source?: string;
  tone?: "error";
};

type CritiquePanelProps = {
  state: CompanionState;
  onStateChange: (state: CompanionState) => Promise<void>;
};

type ChatModel = {
  id: string;
  label: string;
  provider: ChatProviderId;
  description: string;
  badge?: string;
};

type ChatProviderId = "favorites" | "openai" | "anthropic";

type ChatProvider = {
  id: ChatProviderId;
  label: string;
  icon: "star" | "openai" | "claude";
};

const chatProviders: ChatProvider[] = [
  { id: "favorites", label: "Favorites", icon: "star" },
  { id: "anthropic", label: "Claude", icon: "claude" },
  { id: "openai", label: "OpenAI", icon: "openai" },
];

const chatModels: ChatModel[] = [
  {
    id: "claude-opus-4.8",
    label: "Claude Opus 4.8",
    provider: "anthropic",
    description: "Newest flagship Claude model",
    badge: "New",
  },
  {
    id: "claude-sonnet-4.6",
    label: "Claude Sonnet 4.6",
    provider: "anthropic",
    description: "Newest balanced Claude model",
  },
  {
    id: "claude-haiku-4.5",
    label: "Claude Haiku 4.5",
    provider: "anthropic",
    description: "Newest fast Claude model",
  },
  {
    id: "claude-opus-4.7",
    label: "Claude Opus 4.7",
    provider: "anthropic",
    description: "Previous flagship Claude",
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
    id: "gpt-5.5-instant",
    label: "GPT-5.5 Instant",
    provider: "openai",
    description: "Newest fast ChatGPT model",
  },
  {
    id: "gpt-5.4",
    label: "GPT-5.4",
    provider: "openai",
    description: "Previous frontier model",
  },
];

const PANEL_WIDTH = 432;
const PANEL_HEIGHT = 504;
const ACTIVE_COMPANION_BAR_HEIGHT = 42;
const MAIN_WINDOW_BAR_BOTTOM = 12;
const COMPANION_WINDOW_BAR_BOTTOM = 32;
const DEFAULT_CHAT_MODEL = chatModels.find((model) => model.id === "gpt-5.5") ?? chatModels[0]!;
const PROVIDER_ERROR_MESSAGE = "Something went wrong. Please check your integrations for Claude/Codex connection.";

export function CritiquePanel({ state, onStateChange }: CritiquePanelProps) {
  const visible = state === "thinking" || state === "response";
  const isCompanionWindow = new URLSearchParams(window.location.search).get("stageWindow") === "companion";
  const companionBarBottom = isCompanionWindow
    ? COMPANION_WINDOW_BAR_BOTTOM
    : MAIN_WINDOW_BAR_BOTTOM;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [selectedModel, setSelectedModel] = useState<ChatModel>(DEFAULT_CHAT_MODEL);
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const [activeProvider, setActiveProvider] = useState<ChatProviderId>("favorites");
  const [favoriteModelIds, setFavoriteModelIds] = useState<string[]>([
    "gpt-5.5",
    "claude-opus-4.8",
    "claude-sonnet-4.6",
  ]);
  const providerRun = useProviderRun();
  const providerPreferences = useProviderPreferences();
  const modelPickerRef = useRef<HTMLDivElement>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const activeResponseMessageIdRef = useRef<string | null>(null);
  const getOpeningPosition = useCallback(() => ({
    x: Math.max(16, Math.round((window.innerWidth - PANEL_WIDTH) / 2)),
    y: Math.max(
      16,
      window.innerHeight - companionBarBottom - ACTIVE_COMPANION_BAR_HEIGHT - PANEL_HEIGHT,
    ),
  }), [companionBarBottom]);
  const { position, resetPosition, dragHandlers } = useDraggablePanel(getOpeningPosition());
  const inputPlaceholder = messages.length > 0 ? "Ask a follow-up" : "Message Stage";
  const visibleModels = useMemo(() => {
    if (activeProvider === "favorites") {
      return chatModels.filter((model) => favoriteModelIds.includes(model.id));
    }

    return chatModels.filter((model) => model.provider === activeProvider);
  }, [activeProvider, favoriteModelIds]);

  useEffect(() => {
    if (!modelMenuOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (event.target instanceof Node && modelPickerRef.current?.contains(event.target)) {
        return;
      }

      setModelMenuOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setModelMenuOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [modelMenuOpen]);

  useEffect(() => {
    if (!visible || state !== "thinking") {
      return;
    }

    resetPosition(getOpeningPosition());
    void onStateChange("response");
  }, [getOpeningPosition, onStateChange, resetPosition, state, visible]);

  useEffect(() => {
    threadRef.current?.scrollTo({
      top: threadRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isThinking]);

  useEffect(() => {
    const responseMessageId = activeResponseMessageIdRef.current;
    if (!responseMessageId) return;

    const outputText = providerRun.activeRunEvents
      .filter((event): event is Extract<RunEvent, { type: "output_delta" }> => event.type === "output_delta")
      .map((event) => event.text)
      .join("");
    const failedEvent = providerRun.activeRunEvents.find(
      (event): event is Extract<RunEvent, { type: "run_failed" }> => event.type === "run_failed",
    );
    const completedEvent = providerRun.activeRunEvents.find(
      (event): event is Extract<RunEvent, { type: "run_completed" }> => event.type === "run_completed",
    );

    if (failedEvent) {
      setMessages((currentMessages) =>
        currentMessages.map((message) =>
          message.id === responseMessageId
            ? {
                ...message,
                tone: "error",
                content: [failedEvent.error.message || PROVIDER_ERROR_MESSAGE],
              }
            : message,
        ),
      );
      activeResponseMessageIdRef.current = null;
      setIsThinking(false);
      return;
    }

    if (outputText || completedEvent?.finalText) {
      setMessages((currentMessages) =>
        currentMessages.map((message) =>
          message.id === responseMessageId
            ? {
                ...message,
                content: [completedEvent?.finalText ?? outputText],
              }
            : message,
        ),
      );
    }

    if (completedEvent) {
      activeResponseMessageIdRef.current = null;
      setIsThinking(false);
    }
  }, [providerRun.activeRunEvents]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 82)}px`;
  }, [draft]);

  async function submitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextPrompt = draft.trim();

    if (!nextPrompt || isThinking) {
      return;
    }

    setDraft("");
    setMessages((currentMessages) => [
      ...currentMessages,
      {
        id: `user-${Date.now()}`,
        role: "user",
        content: [nextPrompt],
      },
    ]);

    const stageMessageId = `stage-${Date.now()}`;
    activeResponseMessageIdRef.current = stageMessageId;
    setMessages((currentMessages) => [
      ...currentMessages,
      {
        id: stageMessageId,
        role: "stage",
        content: [],
      },
    ]);

    try {
      setIsThinking(true);
      const providerId = getProviderIdForModel(selectedModel);
      if (!providerPreferences.isProviderEnabled(providerId)) {
        throw new Error(`Connect ${providerId === "claude" ? "Claude" : "Codex"} in Integrations before using it in Stage chat.`);
      }

      await providerRun.startRun.mutateAsync({
        providerId,
        modelId: getEngineModelIdForModel(selectedModel),
        prompt: nextPrompt,
        mode: "chat",
        context: {},
        attachments: [],
        modelOptions: [],
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : PROVIDER_ERROR_MESSAGE;
      setMessages((currentMessages) => [
        ...currentMessages.filter((message) => message.id !== stageMessageId),
        { id: stageMessageId, role: "stage", tone: "error", content: [message] },
      ]);
      activeResponseMessageIdRef.current = null;
      setIsThinking(false);
    } finally {
      await onStateChange("response");
    }
  }

  function toggleFavorite(modelId: string, event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    setFavoriteModelIds((currentIds) => {
      if (currentIds.includes(modelId)) {
        return currentIds.filter((id) => id !== modelId);
      }

      return [modelId, ...currentIds];
    });
  }

  if (!visible) {
    return null;
  }

  return (
    <aside
      className="chat-panel"
      style={{ left: position.x, top: position.y }}
      aria-label="Stage chat"
    >
      <header className="chat-panel-header">
        <div className="chat-panel-title">
          <img className="stage-mark" src="/logos/stage.svg" alt="" aria-hidden="true" />
          <strong>Stage chat</strong>
        </div>
        <div className="chat-panel-actions">
          <button
            className="chat-drag-handle"
            type="button"
            aria-label="Drag chat"
            {...dragHandlers}
          >
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
          </button>
          <button
            className="chat-close-button"
            type="button"
            onClick={() => void onStateChange("idle")}
            aria-label="Close chat"
          >
            <span className="voice-close-icon" aria-hidden="true" />
          </button>
        </div>
      </header>

      <div className="chat-thread" ref={threadRef}>
        {messages.map((message) => (
          <div
            className={`chat-message ${message.role === "stage" ? "chat-message-stage" : "chat-message-user"}`}
            key={message.id}
          >
            {message.role === "user" ? (
              <span>You</span>
            ) : (
              <div className="chat-message-label">
            <img className="stage-mark stage-mark-small" src="/logos/stage.svg" alt="" aria-hidden="true" />
          </div>
        )}
        {message.content.map((paragraph) => (
          <p className={message.tone === "error" ? "chat-message-error-text" : undefined} key={paragraph}>{paragraph}</p>
        ))}
            {message.source ? (
              <p>
                Based on: <a href="#brief">{message.source}</a>
              </p>
            ) : null}
          </div>
        ))}
        {isThinking ? (
          <div className="chat-message chat-message-stage">
            <div className="chat-message-label">
              <img className="stage-mark stage-mark-small" src="/logos/stage.svg" alt="" aria-hidden="true" />
              <strong>Stage</strong>
            </div>
            <p className="chat-thinking">Thinking...</p>
          </div>
        ) : null}
      </div>

      <form className="chat-input-bar" onSubmit={submitMessage}>
        <textarea
          ref={textareaRef}
          aria-label="Message Stage"
          placeholder={isThinking ? "Waiting for response..." : inputPlaceholder}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          rows={1}
          onKeyDown={(event) => {
            if (event.key !== "Enter" || event.shiftKey) {
              return;
            }

            event.preventDefault();
            event.currentTarget.form?.requestSubmit();
          }}
        />
        <div className="chat-input-controls">
          <div className="chat-model-picker" ref={modelPickerRef}>
            <button
              className="chat-model-button"
              type="button"
              aria-label="Change model"
              aria-expanded={modelMenuOpen}
              onClick={() => setModelMenuOpen((open) => !open)}
            >
              <ProviderMark provider={selectedModel.provider} />
              <span>{selectedModel.label}</span>
              <span className="chat-model-chevron" aria-hidden="true" />
            </button>
            {modelMenuOpen ? (
              <div className="chat-model-menu" aria-label="Model picker">
                <div className="chat-model-provider-list" role="tablist" aria-label="Providers">
                  {chatProviders.map((provider) => (
                    <button
                      key={provider.id}
                      className={`chat-model-provider ${activeProvider === provider.id ? "chat-model-provider-active" : ""}`}
                      type="button"
                      role="tab"
                      aria-selected={activeProvider === provider.id}
                      onClick={() => setActiveProvider(provider.id)}
                    >
                      <ProviderMark provider={provider.icon} />
                      <span>{provider.label}</span>
                    </button>
                  ))}
                </div>
                <div className="chat-model-list" role="listbox" aria-label="Models">
                  {visibleModels.length > 0 ? (
                    visibleModels.map((model) => {
                      const isFavorite = favoriteModelIds.includes(model.id);

                      return (
                        <div
                          key={model.id}
                          className={`chat-model-option ${model.id === selectedModel.id ? "chat-model-option-active" : ""}`}
                          role="option"
                          aria-selected={model.id === selectedModel.id}
                        >
                          <button
                            className={`chat-model-star ${isFavorite ? "chat-model-star-active" : ""}`}
                            type="button"
                            aria-label={isFavorite ? `Remove ${model.label} from favorites` : `Add ${model.label} to favorites`}
                            onClick={(event) => toggleFavorite(model.id, event)}
                          >
                            ★
                          </button>
                          <button
                            className="chat-model-choice"
                            type="button"
                            onClick={() => {
                              setSelectedModel(model);
                              setModelMenuOpen(false);
                            }}
                          >
                            <ProviderMark provider={model.provider} />
                            <span className="chat-model-copy">
                              <span className="chat-model-name">
                                <span>{model.label}</span>
                                {model.badge ? <span className="chat-model-badge">{model.badge}</span> : null}
                              </span>
                              <span className="chat-model-description">{model.description}</span>
                            </span>
                          </button>
                        </div>
                      );
                    })
                  ) : (
                    <div className="chat-model-empty">
                      <span>No favorites yet</span>
                      <small>Star a model from Claude or OpenAI.</small>
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
          <button
            className="chat-send-button"
            type="submit"
            aria-label="Send message"
            disabled={!draft.trim() || isThinking}
          >
            <span aria-hidden="true">↑</span>
          </button>
        </div>
      </form>
    </aside>
  );
}

function getProviderIdForModel(model: ChatModel): ProviderId {
  return model.provider === "anthropic" ? "claude" : "codex";
}

function getEngineModelIdForModel(model: ChatModel) {
  if (model.provider === "openai") {
    return "codex-default";
  }

  return model.id.replaceAll(".", "-");
}

function ProviderMark({ provider }: { provider: ChatProvider["icon"] | ChatModel["provider"] }) {
  if (provider === "star") {
    return (
      <span className="chat-provider-mark chat-provider-star" aria-hidden="true">
        ★
      </span>
    );
  }

  return (
    <img
      className="chat-provider-mark"
      src={`/logos/integrations/${provider === "anthropic" ? "claude" : provider}.svg`}
      alt=""
      aria-hidden="true"
    />
  );
}
