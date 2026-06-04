import { randomUUID } from "node:crypto";
import {
  voiceTranscriptResponseSchema,
  voiceTranscriptionRequestSchema,
  type ProviderListResponse,
  type VoiceTranscriptionProvider,
  type VoiceTranscriptionRequest,
  type VoiceTranscriptResponse,
} from "@stage/data-ops/contracts";
import { decodeVoiceAudio } from "./audio";
import { transcribeWithChatGptCodex } from "./chatgpt-codex";
import { transcribeWithOpenRouter } from "./openrouter";
import { isOpenRouterConfigured } from "./secrets";
import { readProviderConnectivity } from "./providers";

export type VoiceRouteDecision = {
  provider: VoiceTranscriptionProvider;
  model: VoiceTranscriptionRequest["model"];
  reason: "claude-and-codex" | "codex-only" | "claude-only-openrouter" | "openrouter-fallback";
};

export function decideVoiceRoute(connectivity: ReturnType<typeof readProviderConnectivity>): VoiceRouteDecision | null {
  const openRouterReady = isOpenRouterConfigured();

  if (connectivity.bothConnected) {
    return {
      provider: "chatgpt-codex-session",
      model: "chatgpt-backend-transcribe",
      reason: "claude-and-codex",
    };
  }

  if (connectivity.codexConnected) {
    return {
      provider: "chatgpt-codex-session",
      model: "chatgpt-backend-transcribe",
      reason: "codex-only",
    };
  }

  if (connectivity.claudeConnected && openRouterReady) {
    return {
      provider: "openrouter",
      model: "mistralai/voxtral-mini-transcribe",
      reason: "claude-only-openrouter",
    };
  }

  return null;
}

export function voiceRouteUnavailableMessage(
  connectivity: ReturnType<typeof readProviderConnectivity>,
): string {
  if (connectivity.claudeConnected && !isOpenRouterConfigured()) {
    return "Voice with Claude only needs OPENROUTER_API_KEY in apps/user-application/.env, or connect Codex with ChatGPT for the built-in voice bridge.";
  }

  if (!connectivity.claudeConnected && !connectivity.codexConnected) {
    return "Connect Claude or Codex in Integrations before using voice.";
  }

  if (connectivity.codexConnected) {
    return "Sign in to ChatGPT in Codex for voice transcription, or add OPENROUTER_API_KEY for Claude-only voice.";
  }

  return "Voice transcription is not available with the current provider setup.";
}

function buildVoiceResponse(input: {
  parsedInput: VoiceTranscriptionRequest;
  provider: VoiceTranscriptionProvider;
  model: VoiceTranscriptionRequest["model"];
  text: string;
}): VoiceTranscriptResponse {
  return voiceTranscriptResponseSchema.parse({
    apiVersion: "v1",
    transcriptionId: randomUUID(),
    provider: input.provider,
    model: input.model,
    mode: "batch",
    status: "completed",
    text: input.text,
    durationMs: input.parsedInput.durationMs,
    createdAt: Date.now(),
  });
}

export async function transcribeVoiceWithRouting(input: {
  rawInput: unknown;
  listProviders: () => Promise<ProviderListResponse>;
}): Promise<VoiceTranscriptResponse> {
  const parsedInput = voiceTranscriptionRequestSchema.parse(input.rawInput);
  const audioBuffer = decodeVoiceAudio(parsedInput);
  const cwd = parsedInput.cwd?.trim() || process.cwd();
  const audioBase64 = parsedInput.audioBase64?.trim();

  if (!audioBase64) {
    throw new Error("Voice messages must include recorded audio.");
  }

  const providers = await input.listProviders();
  const connectivity = readProviderConnectivity(providers);
  const route = decideVoiceRoute(connectivity);

  if (!route) {
    throw new Error(voiceRouteUnavailableMessage(connectivity));
  }

  if (route.provider === "openrouter") {
    const text = await transcribeWithOpenRouter({
      audioBase64,
      model: route.model,
      language: parsedInput.language,
    });

    return buildVoiceResponse({
      parsedInput,
      provider: route.provider,
      model: route.model,
      text,
    });
  }

  try {
    const text = await transcribeWithChatGptCodex({
      audioBuffer,
      mimeType: parsedInput.audioMimeType,
      cwd,
    });

    return buildVoiceResponse({
      parsedInput,
      provider: route.provider,
      model: route.model,
      text,
    });
  } catch (primaryError) {
    if (!connectivity.claudeConnected || !isOpenRouterConfigured()) {
      throw primaryError;
    }

    const text = await transcribeWithOpenRouter({
      audioBase64,
      model: "mistralai/voxtral-mini-transcribe",
      language: parsedInput.language,
    });

    return buildVoiceResponse({
      parsedInput,
      provider: "openrouter",
      model: "mistralai/voxtral-mini-transcribe",
      text,
    });
  }
}
