import type { CompanionState } from "@shared/models/desktop";
import { critiqueThread } from "./data/critiqueThread";
import { useDraggablePanel } from "./hooks/useDraggablePanel";

type CritiquePanelProps = {
  state: CompanionState;
  onStateChange: (state: CompanionState) => Promise<void>;
};

export function CritiquePanel({ state, onStateChange }: CritiquePanelProps) {
  const visible = state === "thinking" || state === "response";
  const { position, dragHandlers } = useDraggablePanel({ x: window.innerWidth - 486, y: 238 });

  if (!visible) {
    return null;
  }

  return (
    <aside
      className="critique-panel"
      style={{ left: position.x, top: position.y }}
    >
      <header className="critique-panel-drag-handle" {...dragHandlers}>
        <strong>{critiqueThread.title}</strong>
        <button type="button" onClick={() => void onStateChange("idle")} aria-label="Close">
          ×
        </button>
      </header>

      <div className="critique-thread">
        {critiqueThread.messages.map((message) => (
          <div
            key={message.id}
            className={`message ${message.role === "stage" ? "stage-message" : ""}`}
          >
            <span>{message.label}</span>
            <p>{state === "thinking" && message.role === "stage" ? "Thinking..." : message.content}</p>
            {state === "response" && message.source ? (
              <small>Based on: {message.source}</small>
            ) : null}
          </div>
        ))}
      </div>

      <footer>
        <input placeholder="Ask a follow-up" />
        <button type="button" onClick={() => void onStateChange("response")}>
          Send
        </button>
      </footer>
    </aside>
  );
}
