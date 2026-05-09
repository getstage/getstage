import type { CompanionState } from "@shared/models/desktop";

type VoiceControlBarProps = {
  state: CompanionState;
  onStateChange: (state: CompanionState) => Promise<void>;
};

export function VoiceControlBar({ state, onStateChange }: VoiceControlBarProps) {
  const isListening = state === "listening";
  const isChatOpen = state === "thinking" || state === "response";

  if (isChatOpen) {
    return null;
  }

  return (
    <div
      className={`voice-control-bar ${state === "idle" ? "voice-control-bar-idle" : "voice-control-bar-active"}`}
      data-state={state}
      onMouseEnter={() => {
        if (state === "idle") void onStateChange("listening");
      }}
      onMouseLeave={() => {
        if (state === "listening") void onStateChange("idle");
      }}
      onFocus={() => {
        if (state === "idle") void onStateChange("listening");
      }}
    >
      {state === "idle" ? (
        <button
          className="voice-idle-hit-area"
          type="button"
          aria-label="Open Stage voice control"
        />
      ) : (
        <>
          <button
            className="voice-icon-button"
            type="button"
            onClick={() => void onStateChange("idle")}
            aria-label="Cancel"
          >
            <span className="voice-close-icon" aria-hidden="true" />
          </button>
          <button
            className="voice-wave-button"
            type="button"
            onClick={() => void onStateChange(isListening ? "processing" : "listening")}
            aria-label={isListening ? "Submit voice input" : "Start listening"}
          >
            <span />
            <span />
            <span />
            <span />
            <span />
          </button>
          <button
            className="voice-stage-button"
            type="button"
            onClick={() => void onStateChange("thinking")}
            aria-label="Open Stage chat"
          >
            <img src="/logos/stage.svg" alt="" aria-hidden="true" />
          </button>
          <button
            className="voice-wave-button"
            type="button"
            onClick={() => void onStateChange("thinking")}
            aria-label="Open Stage chat"
          >
            <span />
            <span />
            <span />
            <span />
            <span />
          </button>
          <button
            className="voice-record-button"
            type="button"
            onClick={() => void onStateChange("thinking")}
            aria-label="Send to Stage"
          >
            <img src="/logos/dashboard/stop.svg" alt="" aria-hidden="true" />
          </button>
        </>
      )}
    </div>
  );
}
