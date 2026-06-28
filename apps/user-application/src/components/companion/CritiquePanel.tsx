import { Fragment, FormEvent, MouseEvent, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "convex/react";
import { ImageSquare, Monitor, X } from "@phosphor-icons/react";
import type { CaptureWindowSource, CompanionState } from "@shared/models/desktop";
import { chatProjectReferenceSchema, type ChatProjectReference, type ProviderId, type RunEvent } from "@stage/data-ops/contracts";
import { z } from "zod";
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
import { useProviderStatus } from "@/hooks/engine/useProviderStatus";
import {
  CHAT_RUN_FAILED_USER_MESSAGE,
  toRunFailureUserMessage,
} from "@/lib/engine/formatRunError";
import {
  evaluateProviderPreflight,
  isProviderStatusPending,
} from "@/lib/engine/providerPreflight";
import { clearDesktopSessionIfExpired, toUserFacingErrorMessage } from "@/lib/errors";
import { useDraggablePanel } from "@/hooks/companion/useDraggablePanel";
import {
  createEmptyStageChat,
  createStageChatMessage,
  createTitleFromPrompt,
  deleteStageChat,
  readStageChatStore,
  subscribeToStageChats,
  upsertStageChat,
} from "@/lib/companion/stageChats";
import { SetupStepsDialog } from "@/components/ui/SetupStepsDialog";
import { STAGE_SHORTCUT_OPEN_CHAT } from "@/lib/companion/shortcutEvents";
import type { StageChat, StageChatAttachment, StageChatMessage } from "@/models/companion/chat";
import { useDesktopAuth } from "@/lib/auth";
import { api } from "@/lib/convexApi";

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

const PANEL_WIDTH = 600;
const PANEL_HEIGHT = 511;
const ACTIVE_COMPANION_BAR_HEIGHT = 42;
const MAIN_WINDOW_BAR_BOTTOM = 12;
const COMPANION_WINDOW_BAR_BOTTOM = 32;
const CHAT_VIEWPORT_SIDE_INSET = 12;
const CHAT_VIEWPORT_TOP_INSET = 52;

function selectInitialChat(): StageChat {
  const store = readStageChatStore();
  return stripDraftProject(store.chats.find((chat) => chat.id === store.activeChatId) ?? store.chats[0] ?? createEmptyStageChat());
}

function stripDraftProject(chat: StageChat): StageChat {
  if (!chat.project) {
    return chat;
  }

  const { project: _project, ...rest } = chat;
  return rest;
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
  const [historyOpen, setHistoryOpen] = useState(true);
  const panelSize = { width: PANEL_WIDTH, height: PANEL_HEIGHT };
  const [draft, setDraft] = useState("");
  const [projectContextPrefix, setProjectContextPrefix] = useState("");
  const [selectedProject, setSelectedProject] = useState<ChatProjectReference | undefined>();
  const [draftAttachments, setDraftAttachments] = useState<StageChatAttachment[]>([]);
  const [captureSources, setCaptureSources] = useState<CaptureWindowSource[]>([]);
  const [captureMenuOpen, setCaptureMenuOpen] = useState(false);
  const [screenPermissionDialogOpen, setScreenPermissionDialogOpen] = useState(false);
  const [inputNotice, setInputNotice] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [pendingSeconds, setPendingSeconds] = useState(0);
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
  const { isAuthenticated } = useDesktopAuth();
  const projectMention = draft.match(/(?:^|\s)@([^@\n]*)$/)?.[1].trimStart() ?? null;
  const rawProjectMatches = useQuery(
    api.desktop.searchProjectsForChat,
    isAuthenticated && projectMention !== null
      ? { search: "", limit: 200 }
      : "skip",
  );
  const projectMatches = useMemo(() => {
    if (rawProjectMatches === undefined) {
      return [];
    }

    const projects = z.array(chatProjectReferenceSchema).parse(rawProjectMatches);
    const search = projectMention?.trim().toLocaleLowerCase() ?? "";
    if (!search) {
      return projects;
    }

    return projects
      .filter((project) =>
        project.projectName.toLocaleLowerCase().includes(search) ||
        project.clientName.toLocaleLowerCase().includes(search),
      )
      .sort((left, right) => {
        const leftName = left.projectName.toLocaleLowerCase();
        const rightName = right.projectName.toLocaleLowerCase();
        return Number(rightName.startsWith(search)) - Number(leftName.startsWith(search));
      });
  }, [projectMention, rawProjectMatches]);
  const activeProjectId = selectedProject?.projectId ?? "";
  const providerRun = useProviderRun(
    activeProjectId ? { projectId: activeProjectId, mode: "chat" } : undefined,
  );
  const providerPreferences = useProviderPreferences();
  const providers = useProviderStatus();
  const modelPickerRef = useRef<HTMLDivElement>(null);
  const reasoningPickerRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const activeResponseMessageIdRef = useRef<string | null>(null);
  const activeChatRef = useRef(activeChat);
  const handledMessagesRef = useRef(messages);
  const nonPersistentMessagesRef = useRef<StageChatMessage[] | null>(null);
  const historyShortcutHandledAtRef = useRef(0);
  const getOpeningPosition = useCallback(() => ({
    x: Math.max(16, Math.round((window.innerWidth - panelSize.width) / 2)),
    y: Math.max(
      16,
      window.innerHeight - companionBarBottom - ACTIVE_COMPANION_BAR_HEIGHT - panelSize.height,
    ),
  }), [companionBarBottom, panelSize.height, panelSize.width]);
  const dragBounds = useMemo(() => ({
    bottom: CHAT_VIEWPORT_SIDE_INSET,
    height: panelSize.height,
    left: CHAT_VIEWPORT_SIDE_INSET,
    right: CHAT_VIEWPORT_SIDE_INSET,
    top: isCompanionWindow ? CHAT_VIEWPORT_SIDE_INSET : CHAT_VIEWPORT_TOP_INSET,
    width: panelSize.width,
  }), [isCompanionWindow, panelSize.height, panelSize.width]);
  const { position, resetPosition, dragHandlers } = useDraggablePanel(getOpeningPosition(), dragBounds);
  const inputPlaceholder = "Type here...";
  const recentChats = chatStoreSnapshot.chats;
  const selectedEffortLabel = reasoningEfforts.find((effort) => effort.id === selectedEffort)?.label ?? "Medium";
  const selectedSpeedLabel = responseSpeeds.find((speed) => speed.id === selectedSpeed)?.label ?? "Default";
  const runStarted = providerRun.activeRunEvents.some((event) => event.type === "run_started");
  const thinkingMessage = getPendingResponseMessage({ pendingSeconds, runStarted });

  const visibleModels = useMemo(() => {
    if (activeProvider === "favorites") {
      return availableModels.filter((model) => favoriteModelIds.includes(model.id));
    }

    return availableModels.filter((model) => model.provider === activeProvider);
  }, [activeProvider, availableModels, favoriteModelIds]);

  function runHistoryShortcut() {
    const now = Date.now();
    if (now - historyShortcutHandledAtRef.current < 250) {
      return;
    }

    historyShortcutHandledAtRef.current = now;
    if (visible) {
      setHistoryOpen((open) => !open);
      return;
    }

    openLatestChat();
    setHistoryOpen(true);
    void onStateChange("thinking");
  }

  useEffect(() => subscribeToStageChats(() => {
    setChatStoreSnapshot(readStageChatStore());
  }), []);

  useEffect(() => {
    if (handledMessagesRef.current === messages) {
      return;
    }
    handledMessagesRef.current = messages;

    if (nonPersistentMessagesRef.current === messages) {
      nonPersistentMessagesRef.current = null;
      return;
    }

    const currentChat = stripDraftProject(activeChatRef.current);
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
      runHistoryShortcut();
    }

    window.addEventListener("stage-voice-transcript-ready", handleTranscriptReady);
    window.addEventListener(STAGE_SHORTCUT_OPEN_CHAT, handleOpenLatestChatShortcut);

    return () => {
      window.removeEventListener("stage-voice-transcript-ready", handleTranscriptReady);
      window.removeEventListener(STAGE_SHORTCUT_OPEN_CHAT, handleOpenLatestChatShortcut);
    };
  }, [onStateChange, visible]);

  useEffect(() => {
    function handleHistoryShortcut(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== "k" || (!event.metaKey && !event.ctrlKey)) {
        return;
      }

      event.preventDefault();
      runHistoryShortcut();
    }

    window.addEventListener("keydown", handleHistoryShortcut);

    return () => {
      window.removeEventListener("keydown", handleHistoryShortcut);
    };
  }, [onStateChange, visible]);

  useEffect(() => {
    chatScrollRef.current?.scrollTo({
      top: chatScrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isThinking]);

  useEffect(() => {
    if (!isThinking) {
      setPendingSeconds(0);
      return;
    }

    const intervalId = window.setInterval(() => {
      setPendingSeconds((currentSeconds) => currentSeconds + 1);
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [isThinking]);

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
      console.error("[stage-chat] run failed", failedEvent.error);
      const content = toRunFailureUserMessage(failedEvent, CHAT_RUN_FAILED_USER_MESSAGE);
      setMessages((currentMessages) =>
        currentMessages.map((message) =>
          message.id === responseMessageId
            ? {
                ...message,
                tone: "error",
                content: [content],
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
    const nextHeight = Math.min(textarea.scrollHeight, 82);
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY = textarea.scrollHeight > 82 ? "auto" : "hidden";
  }, [draft]);

  async function submitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const projectTag = selectedProject ? `@${selectedProject.projectName}` : "";
    const nextPrompt = [projectTag, projectContextPrefix.trim(), draft.trim()].filter(Boolean).join(" ");

    if (!nextPrompt || isThinking || isProviderStatusPending(providers.snapshot)) {
      return;
    }
    if (!selectedProject && requiresProjectContext(nextPrompt, draftAttachments.length > 0)) {
      setInputNotice("Select a project with @project before asking Stage to inspect or critique project work.");
      return;
    }

    const providerId = getProviderIdForModel(selectedModel);
    const preflight = evaluateProviderPreflight({
      providerId,
      snapshot: providers.snapshot,
      isEnabled: providerPreferences.isProviderEnabled(providerId),
      context: "chat",
    });
    if (preflight.state === "loading") {
      return;
    }

    setDraft("");
    setProjectContextPrefix("");
    setInputNotice("");
    const submittedAttachments = draftAttachments;
    setDraftAttachments([]);
    const userMessage = createStageChatMessage({
      role: "user",
      content: [nextPrompt],
      attachments: submittedAttachments.map(({ previewDataUrl: _previewDataUrl, ...attachment }) => attachment),
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
    setPendingSeconds(0);
    setMessages((currentMessages) => [
      ...currentMessages,
      stageMessage,
    ]);

    try {
      setIsThinking(true);
      if (preflight.state === "blocked") {
        throw new Error(preflight.message);
      }

      await providerRun.startRun.mutateAsync({
        providerId,
        modelId: getEngineModelIdForModel(selectedModel),
        prompt: nextPrompt,
        mode: "chat",
        context: activeProjectId
          ? { projectId: activeProjectId, source: "chat" }
          : {},
        attachments: submittedAttachments.map((attachment) => ({
          id: attachment.id,
          kind: "image" as const,
          name: attachment.name,
          mimeType: attachment.mimeType,
          localPath: attachment.localPath,
        })),
        modelOptions: [
          { id: "reasoning_effort", value: selectedEffort },
          { id: "response_speed", value: selectedSpeed },
        ],
      });
    } catch (error) {
      console.error("[stage-chat] send failed", error);
      await clearDesktopSessionIfExpired(error);
      const errorMessage = createStageChatMessage({
        id: stageMessageId,
        role: "stage",
        tone: "error",
        content: [
          toUserFacingErrorMessage(error, CHAT_RUN_FAILED_USER_MESSAGE),
        ],
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
    const cleanChat = stripDraftProject(chat);
    activeResponseMessageIdRef.current = null;
    activeChatRef.current = cleanChat;
    nonPersistentMessagesRef.current = cleanChat.messages === messages ? null : cleanChat.messages;
    setIsThinking(false);
    setActiveChat(cleanChat);
    setMessages(cleanChat.messages);
    setDraft("");
    setProjectContextPrefix("");
    setSelectedProject(undefined);
    setDraftAttachments([]);
    setInputNotice("");
    upsertStageChat(cleanChat);
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

  async function removeChat(chatId: string) {
    if (chatId === activeChat.id && isThinking) {
      setInputNotice("Wait for the active response or cancel it before deleting this chat.");
      return;
    }

    try {
      await window.stageDesktop.chat.deleteAttachments({ chatId });
      const store = deleteStageChat(chatId);
      openChat(store.chats.find((chat) => chat.id === store.activeChatId) ?? store.chats[0] ?? createEmptyStageChat());
    } catch (error) {
      setInputNotice(toUserFacingErrorMessage(error, "Stage could not delete that chat's attachments."));
    }
  }

  function pinProject(project: ChatProjectReference) {
    const mentionMatch = draft.match(/(?:^|\s)@[^@\n]*$/);
    const mentionStart = mentionMatch?.index ?? draft.length;
    const prefix = draft.slice(0, mentionStart).trimEnd();
    setSelectedProject(project);
    setProjectContextPrefix(prefix);
    setDraft("");
    setInputNotice("");
    window.requestAnimationFrame(() => textareaRef.current?.focus());
  }

  function removeProjectContext() {
    setSelectedProject(undefined);
    setDraft((current) => [projectContextPrefix, current].filter(Boolean).join(" "));
    setProjectContextPrefix("");
    window.requestAnimationFrame(() => textareaRef.current?.focus());
  }

  async function importImages() {
    try {
      const attachments = await window.stageDesktop.chat.importImages({ chatId: activeChat.id });
      setDraftAttachments((current) => [...current, ...attachments].slice(0, 5));
    } catch (error) {
      setInputNotice(toUserFacingErrorMessage(error, "Stage could not import that image."));
    }
  }

  async function openCaptureMenu() {
    if (captureMenuOpen) {
      setCaptureMenuOpen(false);
      return;
    }

    try {
      const sources = await window.stageDesktop.screen.listWindowSources();

      // macOS hides every capture source until Screen Recording is granted, so an empty list
      // there usually means the permission is off. Only open the guided dialog for the macOS
      // blocked-but-fixable states — on Windows/Linux the permission reads "unknown" and the
      // dialog's System Settings deep-link is a no-op, so fall through to the empty picker.
      if (sources.length === 0) {
        const status = await window.stageDesktop.permissions.getStatus();
        const screenRecording = status["screen-recording"];
        if (screenRecording === "denied" || screenRecording === "not-determined") {
          setScreenPermissionDialogOpen(true);
          return;
        }
      }

      setCaptureSources(sources);
      setCaptureMenuOpen(true);
    } catch (error) {
      setInputNotice(toUserFacingErrorMessage(error, "Stage could not list what's on screen."));
    }
  }

  async function captureWindow(sourceId: string) {
    try {
      const attachment = await window.stageDesktop.screen.captureWindow({
        chatId: activeChat.id,
        sourceId,
      });
      setDraftAttachments((current) => [...current, attachment].slice(0, 5));
      setCaptureMenuOpen(false);
    } catch (error) {
      setInputNotice(toUserFacingErrorMessage(error, "Stage could not capture that screen or window."));
    }
  }

  async function importDroppedImages(files: FileList | File[]) {
    const imageFiles = Array.from(files)
      .filter((file) => ["image/png", "image/jpeg", "image/webp"].includes(file.type))
      .slice(0, 5);
    try {
      const attachments = await Promise.all(imageFiles.map(async (file) =>
        window.stageDesktop.chat.importImageBytes({
          chatId: activeChat.id,
          name: file.name || "pasted-image.png",
          mimeType: file.type as "image/png" | "image/jpeg" | "image/webp",
          bytes: new Uint8Array(await file.arrayBuffer()),
        }),
      ));
      setDraftAttachments((current) => [...current, ...attachments].slice(0, 5));
    } catch (error) {
      setInputNotice(toUserFacingErrorMessage(error, "Stage could not add that image."));
    }
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
        <div className="chat-panel-drag-region" {...dragHandlers}>
        <div className="chat-panel-title">
          <img className="stage-mark" src="/logos/stage.svg" alt="" aria-hidden="true" />
          <strong>Stage</strong>
        </div>
        </div>
        <div className="chat-panel-actions">
          <div className="chat-shortcut-hint" aria-label="Open Stage chat shortcut Command K">
            <img src="/logos/cmd.svg" alt="" aria-hidden="true" />
            <span>K</span>
          </div>
          <button
            className="chat-panel-icon-button"
            type="button"
            onClick={() => setHistoryOpen((open) => !open)}
            aria-label={historyOpen ? "Collapse chat history" : "Expand chat history"}
            aria-expanded={historyOpen}
          >
            <img src="/logos/history.svg" alt="" aria-hidden="true" />
          </button>
          <button
            className="chat-panel-icon-button chat-close-button"
            type="button"
            onClick={() => void onStateChange("idle")}
            aria-label="Close chat"
          >
            <img src="/logos/close-chat.svg" alt="" aria-hidden="true" />
          </button>
        </div>
      </header>

      <div className="chat-panel-body">
        <aside
          className={`chat-history-sidebar ${historyOpen ? "chat-history-sidebar-open" : ""}`}
          aria-label="Chat history"
          aria-hidden={!historyOpen}
        >
          <div className="chat-history-sidebar-content">
            <div className="chat-history-sidebar-main">
              <div className="chat-history-sidebar-header">
                <span>Chat History</span>
                <button
                  className="chat-history-collapse-button"
                  type="button"
                  onClick={() => setHistoryOpen(false)}
                  aria-label="Collapse chat history"
                >
                  <img src="/logos/sidebar.svg" alt="" aria-hidden="true" />
                </button>
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
                      </button>
                      <button
                        className="chat-history-delete-button"
                        type="button"
                        aria-label={`Delete ${chat.title}`}
                        onClick={() => void removeChat(chat.id)}
                      >
                        ×
                      </button>
                    </div>
                  ))
                ) : (
                  <p>No chats yet</p>
                )}
              </div>
            </div>
            <button
              className="chat-history-new-button"
              type="button"
              onClick={startNewChat}
            >
              <span aria-hidden="true">＋</span>
              New Chat
            </button>
          </div>
        </aside>

        <div className="chat-main-column">
      <div className="chat-thread" ref={chatScrollRef}>
        {messages.map((message) => {
          const isPendingStageMessage =
            message.role === "stage" &&
            message.id === activeResponseMessageIdRef.current &&
            isThinking &&
            message.content.length === 0;

          return (
            <div
              className={`chat-message ${message.role === "stage" ? "chat-message-stage" : "chat-message-user"}`}
              key={message.id}
            >
              {message.role === "user" ? (
                <span>You</span>
              ) : (
                <div className="chat-message-label">
                  <img className="stage-mark stage-mark-small" src="/logos/stage.svg" alt="" aria-hidden="true" />
                  <strong>Stage</strong>
                </div>
              )}
              {isPendingStageMessage ? (
                <p className="chat-thinking">{thinkingMessage}</p>
              ) : message.role === "stage" ? (
                <FormattedChatContent
                  content={message.content}
                  tone={message.tone}
                />
              ) : (
                message.content.map((paragraph) => (
                  <p className={message.tone === "error" ? "chat-message-error-text" : undefined} key={paragraph}>{paragraph}</p>
                ))
              )}
              {message.source ? (
                <p>
                  Based on: <a href="#brief">{message.source}</a>
                </p>
              ) : null}
            </div>
          );
        })}
        {!selectedProject && messages.length === 0 ? (
          <p className="chat-context-tip"><strong>Tip:</strong> Type @ to add project context. Then ask about research, strategy, wireframes, or assets — Stage sees the full history.</p>
        ) : null}
      </div>

      <form
        className="chat-input-bar"
        onSubmit={submitMessage}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          void importDroppedImages(event.dataTransfer.files);
        }}
        onPaste={(event) => {
          const files = Array.from(event.clipboardData.items)
            .filter((item) => item.kind === "file")
            .map((item) => item.getAsFile())
            .filter((file): file is File => file !== null);
          if (files.length > 0) {
            event.preventDefault();
            void importDroppedImages(files);
          }
        }}
      >
        {projectMention !== null ? (
          <div className="chat-project-picker" role="listbox" aria-label="Select project">
            {rawProjectMatches === undefined ? (
              <p className="chat-project-picker-status">Finding projects…</p>
            ) : projectMatches.length > 0 ? projectMatches.map((project) => (
              <button className="chat-project-option" key={project.projectId} type="button" onClick={() => pinProject(project)}>
                <strong>@{project.projectName}</strong>
                <span>{project.clientName}</span>
              </button>
            )) : (
              <p className="chat-project-picker-status">No matching projects</p>
            )}
          </div>
        ) : null}
        {captureMenuOpen ? (
          <div className="chat-capture-picker" aria-label="Select a screen or window to capture">
            <div className="chat-capture-picker-header">
              <div>
                <strong>Capture a screen or window</strong>
                <span>Select what Stage should inspect</span>
              </div>
              <button type="button" aria-label="Close capture picker" onClick={() => setCaptureMenuOpen(false)}>
                <X aria-hidden="true" />
              </button>
            </div>
            <div className="chat-capture-grid" role="listbox">
              {captureSources.length > 0 ? captureSources.map((source) => (
                <button
                  key={source.id}
                  className="chat-capture-source"
                  type="button"
                  role="option"
                  aria-label={`Capture ${source.name}`}
                  onClick={() => void captureWindow(source.id)}
                >
                  <span className="chat-capture-preview">
                    <img src={source.previewDataUrl} alt="" />
                  </span>
                  <span className="chat-capture-name">{source.name}</span>
                </button>
              )) : (
                <p className="chat-capture-empty">No screens or windows are available to capture.</p>
              )}
            </div>
          </div>
        ) : null}
        <SetupStepsDialog
          open={screenPermissionDialogOpen}
          onOpenChange={setScreenPermissionDialogOpen}
          icon={<Monitor aria-hidden="true" weight="regular" />}
          title="Allow screen capture"
          description="macOS needs Screen Recording permission before Stage can capture your screen or app windows."
          steps={[
            "Open System Settings → Privacy & Security → Screen Recording.",
            "Turn on Stage in the list.",
            "Quit and reopen Stage so the change takes effect.",
          ]}
          primaryAction={{
            label: "Open System Settings",
            onClick: () =>
              void window.stageDesktop.permissions.openSystemSettings("screen-recording"),
          }}
          closeLabel="Done"
        />
        {draftAttachments.length > 0 ? (
          <div className="chat-attachment-list">
            {draftAttachments.map((attachment) => (
              <button
                key={attachment.id}
                type="button"
                title="Remove image"
                onClick={() => setDraftAttachments((current) => current.filter((item) => item.id !== attachment.id))}
              >
                {attachment.previewDataUrl ? <img src={attachment.previewDataUrl} alt={attachment.name} /> : null}
                <span>{attachment.name}</span>
                <span className="chat-attachment-remove-icon" aria-hidden="true">×</span>
              </button>
            ))}
          </div>
        ) : null}
        {inputNotice ? <p className="chat-input-notice">{inputNotice}</p> : null}
        <div className="chat-compose-field">
          {projectContextPrefix ? (
            <span className="chat-context-prefix">{projectContextPrefix}</span>
          ) : null}
          {selectedProject ? (
            <span
              className="chat-context-chip"
              title={`${selectedProject.projectName} project context`}
            >
              <span>@{selectedProject.projectName}</span>
            </span>
          ) : null}
          <textarea
            ref={textareaRef}
            aria-label="Message Stage"
            placeholder={selectedProject || projectContextPrefix ? "" : inputPlaceholder}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={1}
            onKeyDown={(event) => {
              if (
                event.key === "Backspace" &&
                selectedProject &&
                draft.length === 0 &&
                event.currentTarget.selectionStart === 0 &&
                event.currentTarget.selectionEnd === 0
              ) {
                event.preventDefault();
                removeProjectContext();
                return;
              }

              if (event.key !== "Enter" || event.shiftKey) {
                return;
              }

              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }}
          />
        </div>
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
            <button
              className="chat-attachment-icon-button"
              type="button"
              data-tooltip="Add image"
              aria-label="Add image"
              onClick={() => void importImages()}
            >
              <ImageSquare aria-hidden="true" weight="regular" />
            </button>
            <button
              className="chat-attachment-icon-button"
              type="button"
              data-tooltip="Capture screen or window"
              aria-label="Capture screen or window"
              aria-expanded={captureMenuOpen}
              onClick={() => void openCaptureMenu()}
            >
              <Monitor aria-hidden="true" weight="regular" />
            </button>
          </div>
          <button
            className="chat-send-button"
            type="submit"
            aria-label="Send message"
            disabled={
              (!draft.trim() && !projectContextPrefix.trim()) ||
              isThinking ||
              isProviderStatusPending(providers.snapshot)
            }
          >
            <span aria-hidden="true">↑</span>
          </button>
        </div>
      </form>
        </div>
      </div>
    </aside>
  );
}

function requiresProjectContext(prompt: string, hasAttachments: boolean) {
  if (hasAttachments) {
    return true;
  }
  return /\b(critique|review|inspect|evaluate)\s+(this|the|my)\b|\bbased on (the )?(brief|project|strategy)\b|\b(this|current|my)\s+(layout|design|screen|figma|project|brief)\b/i.test(prompt);
}

function getProviderIdForModel(model: ChatModel): ProviderId {
  return model.provider === "anthropic" ? "claude" : "codex";
}

function FormattedChatContent({
  content,
  tone,
}: {
  content: string[];
  tone?: StageChatMessage["tone"];
}) {
  const text = content.join("\n\n").trim();

  if (!text) {
    return null;
  }

  return (
    <div className={`chat-formatted-content ${tone === "error" ? "chat-message-error-text" : ""}`}>
      {formatChatBlocks(text)}
    </div>
  );
}

function formatChatBlocks(text: string) {
  const lines = text.split(/\r?\n/);
  const blocks: ReactNode[] = [];
  let paragraphLines: string[] = [];
  let listItems: Array<{ marker: string; text: string }> = [];
  let listType: "ol" | "ul" | null = null;

  function flushParagraph() {
    if (paragraphLines.length === 0) return;
    const paragraph = paragraphLines.join(" ").trim();
    if (paragraph) {
      blocks.push(<p key={`p-${blocks.length}`}>{formatInlineChatText(paragraph)}</p>);
    }
    paragraphLines = [];
  }

  function flushList() {
    if (!listType || listItems.length === 0) return;
    const ListTag = listType;
    blocks.push(
      <ListTag key={`list-${blocks.length}`}>
        {listItems.map((item, index) => (
          <li key={`${item.marker}-${index}`}>
            {formatInlineChatText(item.text)}
          </li>
        ))}
      </ListTag>,
    );
    listItems = [];
    listType = null;
  }

  lines.forEach((line) => {
    const trimmedLine = line.trim();
    const orderedMatch = trimmedLine.match(/^(\d+)\.\s+(.+)$/);
    const unorderedMatch = trimmedLine.match(/^[-*]\s+(.+)$/);

    if (!trimmedLine) {
      flushParagraph();
      flushList();
      return;
    }

    if (orderedMatch) {
      flushParagraph();
      if (listType !== "ol") {
        flushList();
        listType = "ol";
      }
      listItems.push({ marker: orderedMatch[1]!, text: orderedMatch[2]! });
      return;
    }

    if (unorderedMatch) {
      flushParagraph();
      if (listType !== "ul") {
        flushList();
        listType = "ul";
      }
      listItems.push({ marker: "-", text: unorderedMatch[1]! });
      return;
    }

    flushList();
    paragraphLines.push(trimmedLine);
  });

  flushParagraph();
  flushList();

  return blocks;
}

function formatInlineChatText(text: string) {
  const nodes: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];
    if (token.startsWith("**")) {
      nodes.push(<strong key={`strong-${match.index}`}>{token.slice(2, -2)}</strong>);
    } else {
      nodes.push(<code key={`code-${match.index}`}>{token.slice(1, -1)}</code>);
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes.map((node, index) => (
    <Fragment key={index}>{node}</Fragment>
  ));
}

function getPendingResponseMessage({
  pendingSeconds,
  runStarted,
}: {
  pendingSeconds: number;
  runStarted: boolean;
}) {
  if (pendingSeconds >= 8) {
    return "Still waiting on the provider...";
  }

  if (runStarted) {
    return "Stage is writing...";
  }

  if (pendingSeconds >= 2) {
    return "Starting the run...";
  }

  return "Sending...";
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
