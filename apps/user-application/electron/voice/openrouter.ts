import { net } from "electron";
import type { VoiceTranscriptionModel } from "@stage/data-ops/contracts";
import { getOpenRouterApiKey } from "./secrets";
import { readTranscriptText } from "./audio";

const OPENROUTER_TRANSCRIPTIONS_URL = "https://openrouter.ai/api/v1/audio/transcriptions";
const DEFAULT_OPENROUTER_MODEL = "mistralai/voxtral-mini-transcribe" as const;

function readNonEmptyString(value: unknown) {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized.length > 0 ? normalized : null;
}

function resolveOpenRouterModel(model: VoiceTranscriptionModel): string {
  if (model === "mistralai/voxtral-mini-transcribe" || model === "voxtral-mini-latest") {
    return model;
  }

  return DEFAULT_OPENROUTER_MODEL;
}

function readOpenRouterError(statusCode: number, body: string) {
  try {
    const payload = JSON.parse(body) as {
      error?: { message?: unknown };
      message?: unknown;
    };
    const providerMessage =
      readNonEmptyString(payload.error?.message) ?? readNonEmptyString(payload.message);
    if (providerMessage) {
      return providerMessage;
    }
  } catch {
    // Fall back to status-based copy.
  }

  if (statusCode === 401) {
    return "OpenRouter rejected the API key. Check OPENROUTER_API_KEY in your desktop .env file.";
  }
  if (statusCode === 402) {
    return "OpenRouter credits are required for voice transcription.";
  }
  if (statusCode === 403) {
    return "OpenRouter rejected this transcription request.";
  }

  return `OpenRouter transcription failed with status ${statusCode}.`;
}

export async function transcribeWithOpenRouter(input: {
  audioBase64: string;
  model: VoiceTranscriptionModel;
  language?: string;
}): Promise<string> {
  const apiKey = getOpenRouterApiKey();
  if (!apiKey) {
    throw new Error(
      "OpenRouter is not configured. Add OPENROUTER_API_KEY to apps/user-application/.env for Claude-only voice.",
    );
  }

  const requestBody: Record<string, unknown> = {
    model: resolveOpenRouterModel(input.model),
    input_audio: {
      data: input.audioBase64,
      format: "wav",
    },
  };

  if (input.language) {
    requestBody.language = input.language;
  }

  const body = JSON.stringify(requestBody);

  return new Promise((resolve, reject) => {
    const request = net.request({
      method: "POST",
      url: OPENROUTER_TRANSCRIPTIONS_URL,
    });

    request.setHeader("Authorization", `Bearer ${apiKey}`);
    request.setHeader("Content-Type", "application/json");
    request.setHeader("HTTP-Referer", "https://stage.app");
    request.setHeader("X-Title", "Stage Desktop");

    request.once("error", (error) => {
      reject(new Error(`OpenRouter transcription request failed: ${error.message}`));
    });

    request.on("response", (response) => {
      let responseBody = "";
      response.on("data", (chunk) => {
        responseBody += chunk.toString();
      });
      response.once("end", () => {
        const statusCode = response.statusCode;
        if (statusCode < 200 || statusCode >= 300) {
          reject(new Error(readOpenRouterError(statusCode, responseBody)));
          return;
        }

        try {
          const payload = JSON.parse(responseBody) as { text?: unknown; transcript?: unknown };
          const text = readTranscriptText(payload);
          if (!text) {
            reject(new Error("OpenRouter did not return any transcript text."));
            return;
          }
          resolve(text);
        } catch {
          reject(new Error("OpenRouter returned an invalid transcription response."));
        }
      });
      response.once("error", (error) => {
        reject(new Error(`OpenRouter transcription response failed: ${error.message}`));
      });
    });

    request.write(body);
    request.end();
  });
}
