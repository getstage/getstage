import { FormEvent, useEffect, useRef, useState } from "react";
import type { CompanionState } from "@shared/models/desktop";
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

const initialStageReply: ChatMessage = {
  id: "initial-stage",
  role: "stage",
  content: [
    "The spacing between sections is 16px. Your brand strategy specifies 32px minimum for the airy direction.",
    "The CTA color #FF4444 doesn’t match the approved palette. Primary actions should be #8782F5",
    "Headline hierarchy looks good. Matches the typography scale.",
  ],
  source: "Brief",
};

function createMockReply(prompt: string): ChatMessage {
  return {
    id: `stage-${Date.now()}`,
    role: "stage",
    content: [
      `I’d treat “${prompt}” as a follow-up critique pass and compare it against the brief, palette, spacing, and hierarchy.`,
      "Mock note: this frontend path is wired now, so the next step can swap this response generator for a real agent stream.",
    ],
    source: "Brief",
  };
}

export function CritiquePanel({ state, onStateChange }: CritiquePanelProps) {
  const visible = state === "thinking" || state === "response";
  const panelWidth = 432;
  const panelHeight = 504;
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [isThinking, setIsThinking] = useState(state === "thinking");
  const threadRef = useRef<HTMLDivElement>(null);
  const { position, dragHandlers } = useDraggablePanel({
    x: Math.max(16, Math.round((window.innerWidth - panelWidth) / 2)),
    y: Math.max(16, window.innerHeight - panelHeight - 12),
  });

  useEffect(() => {
    if (!visible || state !== "thinking") {
      return;
    }

    setIsThinking(true);
    const timeoutId = window.setTimeout(() => {
      setMessages((currentMessages) => {
        if (currentMessages.some((message) => message.id === initialStageReply.id)) {
          return currentMessages;
        }

        return [...currentMessages, initialStageReply];
      });
      setIsThinking(false);
      void onStateChange("response");
    }, 900);

    return () => window.clearTimeout(timeoutId);
  }, [onStateChange, state, visible]);

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
      setMessages((currentMessages) => [...currentMessages, createMockReply(nextPrompt)]);
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
          <span className="stage-mark" aria-hidden="true">S</span>
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
                <span className="stage-mark stage-mark-small" aria-hidden="true">S</span>
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
              <span className="stage-mark stage-mark-small" aria-hidden="true">S</span>
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
