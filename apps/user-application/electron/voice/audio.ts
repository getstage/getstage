import { Buffer } from "node:buffer";
import type { VoiceTranscriptionRequest } from "@stage/data-ops/contracts";

export const MAX_VOICE_AUDIO_BYTES = 10 * 1024 * 1024;
export const MAX_VOICE_DURATION_MS = 120_000;
export const REQUIRED_SAMPLE_RATE_HZ = 24_000;

function readNonEmptyString(value: unknown) {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized.length > 0 ? normalized : null;
}

function normalizeBase64(value: string) {
  const normalized = value.trim().replace(/\s+/g, "");
  return normalized.length > 0 ? normalized : null;
}

function isLikelyBase64(value: string) {
  return /^[A-Za-z0-9+/]+={0,2}$/.test(value);
}

function isLikelyWavBuffer(buffer: Buffer) {
  return (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WAVE"
  );
}

export function decodeVoiceAudio(input: VoiceTranscriptionRequest): Buffer {
  if (input.audioMimeType !== "audio/wav") {
    throw new Error("Only WAV audio is supported for voice transcription.");
  }
  if (input.sampleRateHz !== REQUIRED_SAMPLE_RATE_HZ) {
    throw new Error("Voice transcription requires 24 kHz mono WAV audio.");
  }
  if (!input.durationMs || input.durationMs <= 0) {
    throw new Error("Voice messages must include a positive duration.");
  }
  if (input.durationMs > MAX_VOICE_DURATION_MS) {
    throw new Error("Voice messages are limited to 120 seconds.");
  }
  if (!input.audioBase64) {
    throw new Error("Voice messages must include recorded audio.");
  }

  const normalizedBase64 = normalizeBase64(input.audioBase64);
  if (!normalizedBase64 || !isLikelyBase64(normalizedBase64)) {
    throw new Error("The recorded audio could not be decoded.");
  }

  const audioBuffer = Buffer.from(normalizedBase64, "base64");
  if (!audioBuffer.length || audioBuffer.toString("base64") !== normalizedBase64) {
    throw new Error("The recorded audio could not be decoded.");
  }
  if (audioBuffer.length !== input.audioSizeBytes) {
    throw new Error("The recorded audio size did not match the request metadata.");
  }
  if (audioBuffer.length > MAX_VOICE_AUDIO_BYTES) {
    throw new Error("Voice messages are limited to 10 MB.");
  }
  if (!isLikelyWavBuffer(audioBuffer)) {
    throw new Error("The recorded audio is not a valid WAV file.");
  }

  return audioBuffer;
}

export function readTranscriptText(payload: { text?: unknown; transcript?: unknown }) {
  return readNonEmptyString(payload.text) ?? readNonEmptyString(payload.transcript);
}
