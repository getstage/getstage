import { useCallback, useEffect, useRef, useState } from "react";
import { useVoiceRecorder } from "./useVoiceRecorder";

type VoiceStatus = "idle" | "recording" | "transcribing" | "failed";

type UseVoiceTranscriptionOptions = {
  onTranscript: (text: string) => Promise<void> | void;
  onStateChange: (state: "idle" | "listening" | "processing" | "response" | "error") => Promise<void>;
};

export function useVoiceTranscription({
  onStateChange,
  onTranscript,
}: UseVoiceTranscriptionOptions) {
  const recorder = useVoiceRecorder();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const requestIdRef = useRef(0);
  const busyRef = useRef(false);
  const recorderRef = useRef(recorder);

  recorderRef.current = recorder;

  const start = useCallback(async () => {
    if (busyRef.current || recorderRef.current.isRecording) {
      return;
    }

    busyRef.current = true;
    requestIdRef.current += 1;
    setError(null);

    try {
      await onStateChange("listening");
      await recorderRef.current.startRecording();
      setStatus("recording");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not start recording.";
      console.error("[stage-voice] Could not start recording:", error);
      setError(message);
      setStatus("failed");
      await onStateChange("error");
    } finally {
      busyRef.current = false;
    }
  }, [onStateChange]);

  const cancel = useCallback(async () => {
    requestIdRef.current += 1;
    await recorderRef.current.cancelRecording();
    setError(null);
    setStatus("idle");
    await onStateChange("idle");
  }, [onStateChange]);

  const stopAndTranscribe = useCallback(async () => {
    if (busyRef.current) {
      return;
    }
    if (!recorderRef.current.isRecording) {
      await start();
      return;
    }

    busyRef.current = true;
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setError(null);
    setStatus("transcribing");
    await onStateChange("processing");

    try {
      const recording = await recorderRef.current.stopRecording();
      if (requestIdRef.current !== requestId) {
        return;
      }
      if (!recording) {
        throw new Error("No audio was captured.");
      }

      const voice = window.stageDesktop?.voice;
      if (!voice?.transcribe || !voice.getStatus) {
        throw new Error(
          "Voice is not available in this window. Quit and restart the Stage desktop app.",
        );
      }

      const voiceStatus = await voice.getStatus();
      if (!voiceStatus.canTranscribe) {
        throw new Error(voiceStatus.setupHint ?? "Voice transcription is not available.");
      }

      const response = await voice.transcribe({
        apiVersion: "v1",
        provider: "chatgpt-codex-session",
        model: "chatgpt-backend-transcribe",
        mode: "batch",
        audioBase64: recording.audioBase64,
        audioMimeType: recording.mimeType,
        audioSizeBytes: recording.audioSizeBytes,
        durationMs: recording.durationMs,
        sampleRateHz: recording.sampleRateHz,
        context: {
          source: "companion",
        },
      });

      if (requestIdRef.current !== requestId) {
        return;
      }

      await onTranscript(response.text);
      setStatus("idle");
      await onStateChange("response");
    } catch (error) {
      if (requestIdRef.current !== requestId) {
        return;
      }

      const message =
        error instanceof Error ? sanitizeVoiceError(error.message) : "The voice note could not be transcribed.";
      console.error("[stage-voice] Transcription failed:", error);
      setError(message);
      setStatus("failed");
      await onStateChange("error");
    } finally {
      if (requestIdRef.current === requestId) {
        busyRef.current = false;
      }
    }
  }, [onStateChange, onTranscript, start]);

  const toggle = useCallback(async () => {
    if (recorderRef.current.isRecording) {
      await stopAndTranscribe();
      return;
    }

    await start();
  }, [start, stopAndTranscribe]);

  useEffect(() => {
    const subscribe = window.stageDesktop?.voice?.onStartStopRecordingShortcut;
    if (!subscribe) {
      console.warn(
        "[stage-voice] Desktop voice bridge is unavailable. Quit and restart the Stage app after pulling voice changes.",
      );
      return;
    }

    return subscribe(() => {
      void toggle();
    });
  }, [toggle]);

  return {
    cancel,
    durationLabel: recorder.durationLabel,
    error,
    isRecording: recorder.isRecording,
    isTranscribing: status === "transcribing",
    start,
    status,
    stopAndTranscribe,
    toggle,
    waveformLevels: recorder.waveformLevels,
  };
}

function sanitizeVoiceError(message: string) {
  return message
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/g, "Bearer [redacted]")
    .replace(/Error invoking remote method '[^']+':\s*/g, "")
    .trim();
}
