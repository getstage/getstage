const BEARER_RE = /Bearer\s+[A-Za-z0-9._~+/=-]+/gi;
const SK_OR_RE = /\bsk-or-[A-Za-z0-9_-]+\b/g;
const SK_RE = /\bsk-[A-Za-z0-9_-]{16,}\b/g;
const IPC_RE = /Error invoking remote method '[^']+':\s*/g;

export function sanitizeVoiceErrorMessage(message: string): string {
  return message
    .replace(BEARER_RE, "Bearer [redacted]")
    .replace(SK_OR_RE, "sk-or-[redacted]")
    .replace(SK_RE, "sk-[redacted]")
    .replace(IPC_RE, "")
    .trim();
}

export function toUserFacingVoiceError(error: unknown): string {
  if (error instanceof Error) {
    return sanitizeVoiceErrorMessage(error.message);
  }

  return "Voice transcription failed.";
}
