import type { CompanionState } from "@shared/models/desktop";

type VoiceControlBarProps = {
  state: CompanionState;
  onStateChange: (state: CompanionState) => Promise<void>;
};

export function VoiceControlBar({ state, onStateChange }: VoiceControlBarProps) {
  const isListening = state === "listening";

  return (
    <div className="voice-control-bar">
      <button type="button" onClick={() => void onStateChange("idle")} aria-label="Cancel">
        ×
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
      </button>
      <button type="button" onClick={() => void onStateChange("thinking")} aria-label="Open critique">
        Stage
      </button>
    </div>
  );
}
