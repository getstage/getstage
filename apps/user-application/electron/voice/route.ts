import { randomUUID } from "node:crypto";
import {
  voiceTranscriptResponseSchema,
  voiceTranscriptionRequestSchema,
  type ProviderListResponse,
  type VoiceTranscriptionProvider,
  type ParsedVoiceTranscriptionRequest,
  type VoiceTranscriptResponse,
} from "@stage/data-ops/contracts";
import { decodeVoiceAudio } from "./audio";
import { transcribeWithChatGptCodex } from "./chatgpt-codex";
import { transcribeWithOpenRouter } from "./openrouter";
import { parseVoiceProviderPreferences, type VoiceProviderPreferences } from "./providerPreferences";
import { isOpenRouterConfigured } from "./secrets";
import { readProviderConnectivity, type ProviderConnectivity } from "./providers";

export type VoiceRouteDecision = {
  provider: VoiceTranscriptionProvider;
  model: ParsedVoiceTranscriptionRequest["model"];
  reason: "codex-bridge" | "claude-openrouter";
};

const CHATGPT_CODEX_ROUTE = {
  provider: "chatgpt-codex-session",
  model: "chatgpt-backend-transcribe",
} as const satisfies Pick<VoiceRouteDecision, "provider" | "model">;

const OPENROUTER_ROUTE = {
  provider: "openrouter",
  model: "mistralai/voxtral-mini-transcribe",
} as const satisfies Pick<VoiceRouteDecision, "provider" | "model">;

export function decideVoiceRoute(connectivity: ProviderConnectivity): VoiceRouteDecision | null {
  if (connectivity.codexActive) {
    return { ...CHATGPT_CODEX_ROUTE, reason: "codex-bridge" };
  }

  if (connectivity.claudeActive && isOpenRouterConfigured()) {
    return { ...OPENROUTER_ROUTE, reason: "claude-openrouter" };
  }

  return null;
}

export function voiceRouteUnavailableMessage(connectivity: ProviderConnectivity): string {
  if (connectivity.claudeActive && !isOpenRouterConfigured()) {
    return "Voice transcription is not fully set up yet. Connect Codex with ChatGPT or finish desktop voice setup.";
  }

  if (!connectivity.claudeActive && !connectivity.codexActive) {
    return "Connect Claude or Codex in Integrations before using voice.";
  }

  if (connectivity.codexActive) {
    return "Sign in to ChatGPT in Codex before using voice transcription.";
  }

  return "Voice transcription is not available with the current provider setup.";
}

function buildVoiceResponse(input: {
  parsedInput: ParsedVoiceTranscriptionRequest;
  provider: VoiceTranscriptionProvider;
  model: ParsedVoiceTranscriptionRequest["model"];
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

function resolveConnectivity(
  providers: ProviderListResponse,
  preferences?: VoiceProviderPreferences,
) {
  return readProviderConnectivity(providers, preferences);
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

  const preferences = parseVoiceProviderPreferences(parsedInput.context.providerPreferences);
  const providers = await input.listProviders();
  const connectivity = resolveConnectivity(providers, preferences);
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
    if (!connectivity.claudeActive || !isOpenRouterConfigured()) {
      throw primaryError;
    }

    const text = await transcribeWithOpenRouter({
      audioBase64,
      model: OPENROUTER_ROUTE.model,
      language: parsedInput.language,
    });

    return buildVoiceResponse({
      parsedInput,
      provider: OPENROUTER_ROUTE.provider,
      model: OPENROUTER_ROUTE.model,
      text,
    });
  }
}
