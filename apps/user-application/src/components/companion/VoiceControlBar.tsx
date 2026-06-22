import type { CompanionState } from "@shared/models/desktop";
import { useEffect, useRef, type CSSProperties } from "react";
import { useVoiceTranscription } from "@/hooks/companion/useVoiceTranscription";

type VoiceControlBarProps = {
  state: CompanionState;
  onStateChange: (state: CompanionState) => Promise<void>;
};

type VoiceLevelStyle = CSSProperties & {
  "--voice-level": string;
};

export function VoiceControlBar({ state, onStateChange }: VoiceControlBarProps) {
  const openingChatRef = useRef(false);
  const voice = useVoiceTranscription({
    onStateChange,
    onTranscript: async (text) => {
      window.dispatchEvent(
        new CustomEvent("stage-voice-transcript-ready", {
          detail: { text },
        }),
      );
    },
  });
  const isProcessing = voice.isTranscribing || state === "processing";
  const isChatOpen = state === "thinking" || state === "response";
  const waveformLevels = voice.waveformLevels.length > 0
    ? voice.waveformLevels.slice(-5)
    : [0.7, 0.36, 0.54, 0.86, 0.7];
  const ariaLabel = isProcessing
    ? "Transcribing voice note"
    : voice.isRecording
      ? `Recording voice note ${voice.durationLabel}`
      : "Start voice note";

  const isBarPinned =
    voice.isRecording || isProcessing || voice.status === "failed" || Boolean(voice.error);
  const showExpandedChrome = state !== "idle" || isBarPinned;

  useEffect(() => {
    if (state === "idle" || state === "listening") {
      openingChatRef.current = false;
    }
  }, [state]);

  if (isChatOpen) {
    return null;
  }

  return (
    <div className="voice-control-bar-shell">
      <div
        className={`voice-control-bar ${showExpandedChrome ? "voice-control-bar-active" : "voice-control-bar-idle"}`}
        data-state={voice.status === "failed" ? "error" : isProcessing ? "processing" : voice.isRecording ? "recording" : state}
      >
      {state === "idle" && !isBarPinned ? (
        <>
          <button
            className="voice-choice-button voice-choice-button-primary"
            type="button"
            aria-label="Open Stage voice control"
            onClick={() => void voice.start()}
          >
            <img src="/logos/voice.svg" alt="" aria-hidden="true" />
          </button>
          <button
            className="voice-choice-button voice-choice-button-secondary"
            type="button"
            aria-label="Open Stage chat"
            onPointerDown={() => {
              openingChatRef.current = true;
            }}
            onClick={() => {
              openingChatRef.current = true;
              void onStateChange("thinking");
            }}
          >
            <img src="/logos/chat.svg" alt="" aria-hidden="true" />
          </button>
        </>
      ) : (
        <>
          <button
            className="voice-icon-button"
            type="button"
            onClick={() => void voice.cancel()}
            aria-label="Cancel"
          >
            <span className="voice-close-icon" aria-hidden="true" />
          </button>
          <button
            className="voice-wave-button"
            type="button"
            onClick={() => void voice.toggle()}
            aria-label={ariaLabel}
            disabled={isProcessing}
          >
            {waveformLevels.map((level, index) => (
              <span
                key={`${index}-${level.toFixed(2)}`}
                style={{ "--voice-level": `${Math.max(6, Math.round(6 + level * 20))}px` } as VoiceLevelStyle}
              />
            ))}
          </button>
          <button
            className="voice-stage-button"
            type="button"
            onPointerDown={() => {
              openingChatRef.current = true;
            }}
            onClick={() => {
              openingChatRef.current = true;
              void onStateChange("thinking");
            }}
            aria-label="Open Stage chat"
          >
            <img src="/logos/stage.svg" alt="" aria-hidden="true" />
          </button>
          <button
            className="voice-wave-button"
            type="button"
            onClick={() => void voice.toggle()}
            aria-label={ariaLabel}
            disabled={isProcessing}
          >
            {waveformLevels.map((level, index) => (
              <span
                key={`${index}-${level.toFixed(2)}-secondary`}
                style={{ "--voice-level": `${Math.max(6, Math.round(6 + level * 20))}px` } as VoiceLevelStyle}
              />
            ))}
          </button>
          <button
            className="voice-record-button"
            type="button"
            onClick={() => void voice.stopAndTranscribe()}
            aria-label={voice.isRecording ? "Submit voice input" : "Stop and submit voice input"}
            disabled={isProcessing}
            title={voice.error ?? undefined}
          >
            <img src="/logos/dashboard/stop.svg" alt="" aria-hidden="true" />
          </button>
        </>
      )}
      </div>
      {voice.error ? (
        <p className="voice-control-bar-error" role="alert">
          {voice.error}
        </p>
      ) : null}
    </div>
  );
}
