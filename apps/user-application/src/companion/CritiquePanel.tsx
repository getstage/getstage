import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import type { CompanionState } from "@shared/models/desktop";
import { useSelectedProjectContext } from "../hooks/useSelectedProjectContext";
import { critiqueThread } from "./data/critiqueThread";
import { useDraggablePanel } from "./hooks/useDraggablePanel";

type ChatMessage = {
  id: string;
  role: "user" | "stage";
  content: string[];
  source?: string;
};

type CritiquePanelProps = {
  state: CompanionState;
  onStateChange: (state: CompanionState) => Promise<void>;
};

const initialMessages: ChatMessage[] = [
  {
    id: "initial-user",
    role: "user",
    content: [critiqueThread.prompt],
  },
];

const PANEL_WIDTH = 432;
const PANEL_HEIGHT = 504;
const ACTIVE_COMPANION_BAR_HEIGHT = 42;
const MAIN_WINDOW_BAR_BOTTOM = 12;
const COMPANION_WINDOW_BAR_BOTTOM = 32;

function createInitialStageReply(projectContext: ReturnType<typeof useSelectedProjectContext>["context"]): ChatMessage {
  return {
    id: "initial-stage",
    role: "stage",
    content: [
      `${projectContext.projectName} is currently in ${projectContext.currentPhase ?? "active work"}, so I would judge this pass against brief clarity first.`,
      projectContext.visualDirection
        ? `Visual direction: ${projectContext.visualDirection}`
        : "Visual direction is not set for this project yet.",
      "The CTA color #FF4444 does not match the approved palette. Primary actions should use #8782F5.",
    ],
    source: "Project Context",
  };
}

export function CritiquePanel({ state, onStateChange }: CritiquePanelProps) {
  const selectedProject = useSelectedProjectContext();
  const visible = state === "thinking" || state === "response";
  const isCompanionWindow = new URLSearchParams(window.location.search).get("stageWindow") === "companion";
  const companionBarBottom = isCompanionWindow
    ? COMPANION_WINDOW_BAR_BOTTOM
    : MAIN_WINDOW_BAR_BOTTOM;
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [isThinking, setIsThinking] = useState(state === "thinking");
  const threadRef = useRef<HTMLDivElement>(null);
  const getOpeningPosition = useCallback(() => ({
    x: Math.max(16, Math.round((window.innerWidth - PANEL_WIDTH) / 2)),
    y: Math.max(
      16,
      window.innerHeight - companionBarBottom - ACTIVE_COMPANION_BAR_HEIGHT - PANEL_HEIGHT,
    ),
  }), [companionBarBottom]);
  const { position, resetPosition, dragHandlers } = useDraggablePanel(getOpeningPosition());

  useEffect(() => {
    if (!visible || state !== "thinking") {
      return;
    }

    resetPosition(getOpeningPosition());
    setIsThinking(true);
    const timeoutId = window.setTimeout(() => {
      setMessages((currentMessages) => {
        if (currentMessages.some((message) => message.id === "initial-stage")) {
          return currentMessages;
        }

        return [...currentMessages, createInitialStageReply(selectedProject.context)];
      });
      setIsThinking(false);
      void onStateChange("response");
    }, 900);

    return () => window.clearTimeout(timeoutId);
  }, [getOpeningPosition, onStateChange, resetPosition, selectedProject.context, state, visible]);

  useEffect(() => {
    threadRef.current?.scrollTo({
      top: threadRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isThinking]);

  function submitMessage(event: FormEvent<HTMLFormElement>) {
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
    setIsThinking(true);

    window.setTimeout(() => {
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: `stage-${Date.now()}`,
          role: "stage",
          content: [
            `I would treat "${nextPrompt}" as a follow-up critique pass against ${selectedProject.context.projectName}.`,
            selectedProject.summary,
          ],
          source: "Project Context",
        },
      ]);
      setIsThinking(false);
      void onStateChange("response");
    }, 700);
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
          <strong>{critiqueThread.title}</strong>
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
              <p key={paragraph}>{paragraph}</p>
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
        <input
          aria-label="Message Stage"
          placeholder={isThinking ? "Type here..." : "Ask a follow-up"}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
        <button
          className="chat-send-button"
          type="submit"
          aria-label="Send message"
          disabled={!draft.trim() || isThinking}
        >
          <span aria-hidden="true">↑</span>
        </button>
      </form>
    </aside>
  );
}
