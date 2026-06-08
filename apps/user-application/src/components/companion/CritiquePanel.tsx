import { FormEvent, MouseEvent, PointerEvent as ReactPointerEvent, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CompanionState } from "@shared/models/desktop";
import type { ProviderId, RunEvent } from "@stage/data-ops/contracts";
import {
  getChatModelById,
  reasoningEfforts,
  responseSpeeds,
  type ChatModel,
  type ChatProviderId,
  useAvailableChatModels,
  useChatDefaults,
} from "@/hooks/engine/useChatDefaults";
import { useProviderPreferences } from "@/hooks/engine/useProviderPreferences";
import { useProviderRun } from "@/hooks/engine/useProviderRun";
import { useDraggablePanel } from "@/hooks/companion/useDraggablePanel";
import {
  createEmptyStageChat,
  createStageChatMessage,
  createTitleFromPrompt,
  deleteStageChat,
  readStageChatPanelSize,
  readStageChatStore,
  subscribeToStageChats,
  upsertStageChat,
  writeStageChatPanelSize,
} from "@/lib/companion/stageChats";
import { STAGE_SHORTCUT_OPEN_CHAT } from "@/lib/companion/shortcutEvents";
import type { StageChat, StageChatMessage } from "@/models/companion/chat";

type CritiquePanelProps = {
  state: CompanionState;
  onStateChange: (state: CompanionState) => Promise<void>;
};

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

const PANEL_WIDTH = 432;
const PANEL_HEIGHT = 504;
const PANEL_MAX_WIDTH = 1100;
const PANEL_MAX_HEIGHT = 900;
const ACTIVE_COMPANION_BAR_HEIGHT = 42;
const MAIN_WINDOW_BAR_BOTTOM = 12;
const COMPANION_WINDOW_BAR_BOTTOM = 32;
const PROVIDER_ERROR_MESSAGE = "Something went wrong. Please check your integrations for Claude/Codex connection.";

type ResizeStart = {
  height: number;
  pointerX: number;
  pointerY: number;
  width: number;
};

function selectInitialChat(): StageChat {
  const store = readStageChatStore();
  return store.chats.find((chat) => chat.id === store.activeChatId) ?? store.chats[0] ?? createEmptyStageChat();
}

export function CritiquePanel({ state, onStateChange }: CritiquePanelProps) {
  const visible = state === "thinking" || state === "response";
  const isCompanionWindow = new URLSearchParams(window.location.search).get("stageWindow") === "companion";
  const companionBarBottom = isCompanionWindow
    ? COMPANION_WINDOW_BAR_BOTTOM
    : MAIN_WINDOW_BAR_BOTTOM;
  const [activeChat, setActiveChat] = useState<StageChat>(() => selectInitialChat());
  const [messages, setMessages] = useState<StageChatMessage[]>(() => activeChat.messages);
  const [chatStoreSnapshot, setChatStoreSnapshot] = useState(() => readStageChatStore());
  const [historyOpen, setHistoryOpen] = useState(false);
  const [panelSize, setPanelSize] = useState(() => readStageChatPanelSize());
  const [draft, setDraft] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const chatDefaults = useChatDefaults();
  const availableModels = useAvailableChatModels();
  const [selectedModel, setSelectedModel] = useState<ChatModel>(chatDefaults.selectedModel);
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const [reasoningMenuOpen, setReasoningMenuOpen] = useState(false);
  const [selectedEffort, setSelectedEffort] = useState(chatDefaults.selectedEffort);
  const [selectedSpeed, setSelectedSpeed] = useState(chatDefaults.selectedSpeed);
  const [activeProvider, setActiveProvider] = useState<ChatProviderId>("favorites");
  const [favoriteModelIds, setFavoriteModelIds] = useState<string[]>([
    "gpt-5.5",
    "claude-opus-4.8",
    "claude-sonnet-4.6",
  ]);
  const providerRun = useProviderRun();
  const providerPreferences = useProviderPreferences();
  const modelPickerRef = useRef<HTMLDivElement>(null);
  const reasoningPickerRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const activeResponseMessageIdRef = useRef<string | null>(null);
  const activeChatRef = useRef(activeChat);
  const handledMessagesRef = useRef(messages);
  const nonPersistentMessagesRef = useRef<StageChatMessage[] | null>(null);
  const resizeStartRef = useRef<ResizeStart | null>(null);
  const panelSizeRef = useRef(panelSize);
  const getOpeningPosition = useCallback(() => ({
    x: Math.max(16, Math.round((window.innerWidth - panelSize.width) / 2)),
    y: Math.max(
      16,
      window.innerHeight - companionBarBottom - ACTIVE_COMPANION_BAR_HEIGHT - panelSize.height,
    ),
  }), [companionBarBottom, panelSize.height, panelSize.width]);
  const { position, resetPosition, dragHandlers } = useDraggablePanel(getOpeningPosition());
  const inputPlaceholder = messages.length > 0 ? "Ask a follow-up" : "Message Stage";
  const recentChats = chatStoreSnapshot.chats;
  const selectedEffortLabel = reasoningEfforts.find((effort) => effort.id === selectedEffort)?.label ?? "Medium";
  const selectedSpeedLabel = responseSpeeds.find((speed) => speed.id === selectedSpeed)?.label ?? "Default";
  const visibleModels = useMemo(() => {
    if (activeProvider === "favorites") {
      return availableModels.filter((model) => favoriteModelIds.includes(model.id));
    }

    return availableModels.filter((model) => model.provider === activeProvider);
  }, [activeProvider, availableModels, favoriteModelIds]);

  useEffect(() => subscribeToStageChats(() => {
    setChatStoreSnapshot(readStageChatStore());
  }), []);

  useEffect(() => {
    panelSizeRef.current = panelSize;
  }, [panelSize]);

  useEffect(() => {
    if (handledMessagesRef.current === messages) {
      return;
    }
    handledMessagesRef.current = messages;

    if (nonPersistentMessagesRef.current === messages) {
      nonPersistentMessagesRef.current = null;
      return;
    }

    const currentChat = activeChatRef.current;
    const nextChat = {
      ...currentChat,
      title: currentChat.title === "New chat"
        ? createTitleFromPrompt(messages.find((message) => message.role === "user")?.content.join(" ") ?? "")
        : currentChat.title,
      updatedAt: Date.now(),
      messages,
    };

    activeChatRef.current = nextChat;
    setActiveChat(nextChat);
    if (!activeResponseMessageIdRef.current) {
      upsertStageChat(nextChat);
    }
  }, [messages]);

  useEffect(() => {
    setSelectedModel(getChatModelById(chatDefaults.defaults.modelId, availableModels));
    setSelectedEffort(chatDefaults.selectedEffort);
    setSelectedSpeed(chatDefaults.selectedSpeed);
  }, [chatDefaults.defaults.modelId, chatDefaults.selectedEffort, chatDefaults.selectedSpeed]);

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
    if (!reasoningMenuOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (event.target instanceof Node && reasoningPickerRef.current?.contains(event.target)) {
        return;
      }

      setReasoningMenuOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setReasoningMenuOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [reasoningMenuOpen]);

  useEffect(() => {
    if (!visible || state !== "thinking") {
      return;
    }

    resetPosition(getOpeningPosition());
    void onStateChange("response");
  }, [getOpeningPosition, onStateChange, resetPosition, state, visible]);

  useEffect(() => {
    function handleTranscriptReady(event: Event) {
      const text = event instanceof CustomEvent && typeof event.detail?.text === "string"
        ? event.detail.text.trim()
        : "";

      if (!text) {
        return;
      }

      setDraft((currentDraft) => {
        if (!currentDraft.trim()) {
          return text;
        }

        return `${currentDraft.trimEnd()}\n${text}`;
      });
      void onStateChange("response");
      window.requestAnimationFrame(() => {
        textareaRef.current?.focus();
      });
    }

    function handleOpenLatestChatShortcut() {
      openLatestChat();
      void onStateChange("thinking");
      window.requestAnimationFrame(() => {
        textareaRef.current?.focus();
      });
    }

    window.addEventListener("stage-voice-transcript-ready", handleTranscriptReady);
    window.addEventListener(STAGE_SHORTCUT_OPEN_CHAT, handleOpenLatestChatShortcut);

    return () => {
      window.removeEventListener("stage-voice-transcript-ready", handleTranscriptReady);
      window.removeEventListener(STAGE_SHORTCUT_OPEN_CHAT, handleOpenLatestChatShortcut);
    };
  }, [onStateChange]);

  useEffect(() => {
    chatScrollRef.current?.scrollTo({
      top: chatScrollRef.current.scrollHeight,
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
    const userMessage = createStageChatMessage({
      role: "user",
      content: [nextPrompt],
    });
    setMessages((currentMessages) => [
      ...currentMessages,
      userMessage,
    ]);

    const stageMessage = createStageChatMessage({
      role: "stage",
      content: [],
    });
    const stageMessageId = stageMessage.id;
    activeResponseMessageIdRef.current = stageMessageId;
    setMessages((currentMessages) => [
      ...currentMessages,
      stageMessage,
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
        modelOptions: [
          { id: "reasoning_effort", value: selectedEffort },
          { id: "response_speed", value: selectedSpeed },
        ],
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : PROVIDER_ERROR_MESSAGE;
      const errorMessage = createStageChatMessage({
        id: stageMessageId,
        role: "stage",
        tone: "error",
        content: [message],
      });
      setMessages((currentMessages) => [
        ...currentMessages.filter((message) => message.id !== stageMessageId),
        errorMessage,
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

  function openChat(chat: StageChat) {
    activeResponseMessageIdRef.current = null;
    activeChatRef.current = chat;
    nonPersistentMessagesRef.current = chat.messages === messages ? null : chat.messages;
    setIsThinking(false);
    setActiveChat(chat);
    setMessages(chat.messages);
    setHistoryOpen(false);
    upsertStageChat(chat);
  }

  function openLatestChat() {
    const store = readStageChatStore();
    openChat(store.chats[0] ?? createEmptyStageChat());
  }

  function startNewChat() {
    openChat(createEmptyStageChat());
    window.requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  }

  function deleteChat(chatId: string, event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    const wasActive = activeChat.id === chatId;
    const nextStore = deleteStageChat(chatId);
    setChatStoreSnapshot(nextStore);

    if (!wasActive) {
      return;
    }

    if (nextStore.chats.length === 0) {
      startNewChat();
      return;
    }

    const nextChat = nextStore.chats.find((chat) => chat.id === nextStore.activeChatId) ?? nextStore.chats[0]!;
    openChat(nextChat);
  }

  function startResize(event: ReactPointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    const start = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      width: panelSizeRef.current.width,
      height: panelSizeRef.current.height,
    };
    resizeStartRef.current = start;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function resizePanel(event: ReactPointerEvent<HTMLButtonElement>) {
    const start = resizeStartRef.current;
    if (!start) {
      return;
    }

    const maxWidth = Math.min(PANEL_MAX_WIDTH, window.innerWidth - position.x - 16);
    const maxHeight = Math.min(PANEL_MAX_HEIGHT, window.innerHeight - position.y - 16);
    const nextSize = {
      width: clamp(
        Math.round(start.width + event.clientX - start.pointerX),
        PANEL_WIDTH,
        Math.max(PANEL_WIDTH, maxWidth),
      ),
      height: clamp(
        Math.round(start.height + event.clientY - start.pointerY),
        PANEL_HEIGHT,
        Math.max(PANEL_HEIGHT, maxHeight),
      ),
    };
    panelSizeRef.current = nextSize;
    setPanelSize(nextSize);
  }

  function stopResize(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!resizeStartRef.current) {
      return;
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    resizeStartRef.current = null;
    writeStageChatPanelSize(panelSizeRef.current);
  }

  if (!visible) {
    return null;
  }

  return (
    <aside
      className="chat-panel"
      style={{ left: position.x, top: position.y, width: panelSize.width, height: panelSize.height }}
      aria-label="Stage chat"
    >
      <header className="chat-panel-header">
        <div className="chat-panel-title">
          <img className="stage-mark" src="/logos/stage.svg" alt="" aria-hidden="true" />
          <strong>Stage chat</strong>
        </div>
        <div className="chat-panel-actions">
          <button
            className="chat-history-button"
            type="button"
            onClick={() => setHistoryOpen((open) => !open)}
            aria-label="Open recent chats"
            aria-expanded={historyOpen}
          >
            Recent
          </button>
          <button
            className="chat-new-button"
            type="button"
            onClick={startNewChat}
            aria-label="Start new chat"
          >
            New
          </button>
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

      {historyOpen ? (
        <div className="chat-history-popover" aria-label="Recent chats">
          <div className="chat-history-header">
            <strong>Recent chats</strong>
            <button type="button" onClick={startNewChat}>New chat</button>
          </div>
          <div className="chat-history-list">
            {recentChats.length > 0 ? (
              recentChats.map((chat) => (
                <div
                  className={`chat-history-item ${chat.id === activeChat.id ? "chat-history-item-active" : ""}`}
                  key={chat.id}
                >
                  <button
                    className="chat-history-item-button"
                    type="button"
                    onClick={() => openChat(chat)}
                  >
                    <span>{chat.title}</span>
                    <small>{formatChatDate(chat.updatedAt)}</small>
                  </button>
                  <button
                    className="chat-history-delete-button"
                    type="button"
                    aria-label={`Delete ${chat.title}`}
                    onClick={(event) => deleteChat(chat.id, event)}
                  >
                    <span aria-hidden="true">×</span>
                  </button>
                </div>
              ))
            ) : (
              <p>No chats yet</p>
            )}
          </div>
        </div>
      ) : null}

      <div className="chat-thread" ref={chatScrollRef}>
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
        {renderMessageContent(message)}
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
          <div className="chat-control-group">
            <div className="chat-model-picker" ref={modelPickerRef}>
              <button
                className="chat-model-button"
                type="button"
                aria-label="Change model"
                aria-expanded={modelMenuOpen}
                onClick={() => {
                  setModelMenuOpen((open) => !open);
                  setReasoningMenuOpen(false);
                }}
              >
                <ProviderMark provider={selectedModel.provider} />
                <span>{selectedModel.label}</span>
                <span className={`chat-model-chevron ${modelMenuOpen ? "chat-model-chevron-open" : ""}`} aria-hidden="true" />
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
                                chatDefaults.setDefaults({ modelId: model.id });
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
            <div className="chat-reasoning-picker" ref={reasoningPickerRef}>
              <button
                className="chat-model-button chat-reasoning-button"
                type="button"
                aria-label="Change reasoning settings"
                aria-expanded={reasoningMenuOpen}
                onClick={() => {
                  setReasoningMenuOpen((open) => !open);
                  setModelMenuOpen(false);
                }}
              >
                <span>{selectedSpeedLabel}</span>
                <span className="chat-reasoning-divider" aria-hidden="true" />
                <span>{selectedEffortLabel}</span>
                <span className={`chat-model-chevron ${reasoningMenuOpen ? "chat-model-chevron-open" : ""}`} aria-hidden="true" />
              </button>
              {reasoningMenuOpen ? (
                <div className="chat-reasoning-menu" aria-label="Reasoning settings">
                  <div className="chat-reasoning-section">
                    <p>Mode</p>
                    {responseSpeeds.map((speed) => (
                      <button
                        key={speed.id}
                        className="chat-reasoning-option"
                        type="button"
                        aria-pressed={selectedSpeed === speed.id}
                        onClick={() => {
                          setSelectedSpeed(speed.id);
                          chatDefaults.setDefaults({ responseSpeed: speed.id });
                        }}
                      >
                        <span className="chat-reasoning-check" aria-hidden="true">
                          {selectedSpeed === speed.id ? "✓" : ""}
                        </span>
                        <span>{speed.label}</span>
                      </button>
                    ))}
                  </div>
                  <div className="chat-reasoning-section">
                    <p>Effort</p>
                    {reasoningEfforts.map((effort) => (
                      <button
                        key={effort.id}
                        className="chat-reasoning-option"
                        type="button"
                        aria-pressed={selectedEffort === effort.id}
                        onClick={() => {
                          setSelectedEffort(effort.id);
                          chatDefaults.setDefaults({ reasoningEffort: effort.id });
                        }}
                      >
                        <span className="chat-reasoning-check" aria-hidden="true">
                          {selectedEffort === effort.id ? "✓" : ""}
                        </span>
                        <span>{effort.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
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
      <button
        className="chat-resize-handle"
        type="button"
        aria-label="Resize chat"
        onPointerDown={startResize}
        onPointerMove={resizePanel}
        onPointerUp={stopResize}
        onPointerCancel={stopResize}
      />
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

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function formatChatDate(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    day: "numeric",
  }).format(new Date(timestamp));
}

function normalizeChatText(text: string) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\.{4,}/g, "...")
    .split("\n")
    .filter((line) => !/^\s*\.{2,}\s*$/.test(line))
    .join("\n")
    .trim();
}

function renderInlineMarkdown(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={`${part}-${index}`}>{part.slice(2, -2)}</strong>;
    }

    return part;
  });
}

function renderMessageContent(message: StageChatMessage) {
  const blocks = message.content
    .map(normalizeChatText)
    .filter(Boolean)
    .flatMap((text) => text.split(/\n{2,}/g));

  if (blocks.length === 0) {
    return null;
  }

  return blocks.map((block, index) => {
    const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
    const isList = lines.length > 0 && lines.every((line) => /^([-*]\s+|\d+\.\s+)/.test(line));

    if (isList) {
      return (
        <ul className="chat-message-list" key={`${message.id}-list-${index}`}>
          {lines.map((line, lineIndex) => (
            <li key={`${line}-${lineIndex}`}>
              {renderInlineMarkdown(line.replace(/^([-*]\s+|\d+\.\s+)/, ""))}
            </li>
          ))}
        </ul>
      );
    }

    return (
      <p
        className={message.tone === "error" ? "chat-message-error-text" : undefined}
        key={`${message.id}-paragraph-${index}`}
      >
        {renderInlineMarkdown(lines.join(" "))}
      </p>
    );
  });
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
