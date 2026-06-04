import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { Buffer } from "node:buffer";
import { app, ipcMain, net } from "electron";
import {
  voiceTranscriptResponseSchema,
  voiceTranscriptionRequestSchema,
  type VoiceTranscriptResponse,
  type VoiceTranscriptionRequest,
} from "@stage/data-ops/contracts";
import { IPC_CHANNELS } from "@shared/ipc/channels";

const CHATGPT_TRANSCRIPTIONS_URL = "https://chatgpt.com/backend-api/transcribe";
const MAX_AUDIO_BYTES = 10 * 1024 * 1024;
const MAX_DURATION_MS = 120_000;
const REQUIRED_SAMPLE_RATE_HZ = 24_000;
const AUTH_DISCOVERY_TIMEOUT_MS = 10_000;

type VoiceAuth = {
  token: string;
  transcriptionUrl: string;
};

type UploadResponse = {
  body: string;
  statusCode: number;
};

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

function decodeVoiceAudio(input: VoiceTranscriptionRequest) {
  if (input.provider !== "chatgpt-codex-session") {
    throw new Error("Stage V1 voice transcription requires the ChatGPT/Codex session provider.");
  }
  if (input.model !== "chatgpt-backend-transcribe") {
    throw new Error("Stage V1 voice transcription requires the ChatGPT backend transcription model.");
  }
  if (input.audioMimeType !== "audio/wav") {
    throw new Error("Only WAV audio is supported for voice transcription.");
  }
  if (input.sampleRateHz !== REQUIRED_SAMPLE_RATE_HZ) {
    throw new Error("Voice transcription requires 24 kHz mono WAV audio.");
  }
  if (!input.durationMs || input.durationMs <= 0) {
    throw new Error("Voice messages must include a positive duration.");
  }
  if (input.durationMs > MAX_DURATION_MS) {
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
  if (audioBuffer.length > MAX_AUDIO_BYTES) {
    throw new Error("Voice messages are limited to 10 MB.");
  }
  if (!isLikelyWavBuffer(audioBuffer)) {
    throw new Error("The recorded audio is not a valid WAV file.");
  }

  return audioBuffer;
}

async function resolveChatGptVoiceAuth(cwd: string): Promise<VoiceAuth> {
  return new Promise((resolve, reject) => {
    const child = spawn("codex", ["app-server"], {
      cwd,
      env: process.env,
      shell: process.platform === "win32",
      stdio: ["pipe", "pipe", "pipe"],
    });

    let settled = false;
    let stdoutBuffer = "";
    let timeout: NodeJS.Timeout | null = null;

    const cleanup = () => {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      child.kill();
    };

    const rejectOnce = (error: Error) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      reject(error);
    };

    const resolveOnce = (value: VoiceAuth) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      resolve(value);
    };

    const send = (payload: Record<string, unknown>) => {
      child.stdin.write(`${JSON.stringify(payload)}\n`);
    };

    child.once("error", (error) => {
      rejectOnce(new Error(`Could not start Codex auth discovery: ${error.message}`));
    });

    child.stderr.on("data", () => {
      // Codex may write non-JSON logs to stderr; stdout JSON-RPC is authoritative.
    });

    child.stdout.on("data", (chunk) => {
      stdoutBuffer += chunk.toString();
      const lines = stdoutBuffer.split(/\n/);
      stdoutBuffer = lines.pop() ?? "";

      for (const line of lines) {
        let message: Record<string, unknown>;
        try {
          message = JSON.parse(line) as Record<string, unknown>;
        } catch {
          continue;
        }

        if (message.id === 1) {
          send({ jsonrpc: "2.0", method: "initialized", params: {} });
          send({
            jsonrpc: "2.0",
            id: 2,
            method: "getAuthStatus",
            params: { includeToken: true, refreshToken: true },
          });
          continue;
        }

        if (message.id !== 2) {
          continue;
        }

        const result =
          typeof message.result === "object" && message.result !== null
            ? (message.result as Record<string, unknown>)
            : null;
        const authMethod = readNonEmptyString(result?.authMethod);
        const token = readNonEmptyString(result?.authToken);

        if (!token) {
          rejectOnce(
            new Error("No ChatGPT session token is available. Sign in to ChatGPT in Codex."),
          );
          return;
        }

        if (authMethod !== "chatgpt" && authMethod !== "chatgptAuthTokens") {
          rejectOnce(
            new Error("Voice transcription requires a ChatGPT-authenticated Codex session."),
          );
          return;
        }

        resolveOnce({
          token,
          transcriptionUrl:
            readNonEmptyString(result?.transcriptionUrl) ?? CHATGPT_TRANSCRIPTIONS_URL,
        });
      }
    });

    timeout = setTimeout(() => {
      rejectOnce(new Error("Timed out while reading ChatGPT auth from Codex."));
    }, AUTH_DISCOVERY_TIMEOUT_MS);
    timeout.unref();

    setTimeout(() => {
      if (settled) {
        return;
      }
      send({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          clientInfo: {
            name: "stage-desktop",
            title: "Stage Desktop",
            version: app.getVersion(),
          },
          capabilities: { experimentalApi: true },
        },
      });
    }, 100).unref();
  });
}

async function requestChatGptTranscription(input: {
  audioBuffer: Buffer;
  mimeType: string;
  token: string;
  transcriptionUrl: string;
}): Promise<UploadResponse> {
  const boundary = `StageVoice-${randomUUID()}`;
  const preamble = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="voice.wav"\r\nContent-Type: ${input.mimeType}\r\n\r\n`,
    "utf8",
  );
  const closing = Buffer.from(`\r\n--${boundary}--\r\n`, "utf8");
  const body = Buffer.concat([preamble, input.audioBuffer, closing]);

  return new Promise((resolve, reject) => {
    const requestUrl = readNonEmptyString(input.transcriptionUrl) ?? CHATGPT_TRANSCRIPTIONS_URL;
    const request = net.request({
      method: "POST",
      url: requestUrl,
    });

    request.setHeader("Authorization", `Bearer ${input.token}`);
    request.setHeader("Content-Type", `multipart/form-data; boundary=${boundary}`);

    request.once("error", (error) => {
      reject(new Error(`Voice transcription request failed: ${error.message}`));
    });

    request.on("response", (response) => {
      let responseBody = "";
      response.on("data", (chunk) => {
        responseBody += chunk.toString();
      });
      response.once("end", () => {
        resolve({
          body: responseBody,
          statusCode: response.statusCode,
        });
      });
      response.once("error", (error) => {
        reject(new Error(`Voice transcription response failed: ${error.message}`));
      });
    });

    request.write(body);
    request.end();
  });
}

function readProviderError(statusCode: number, body: string) {
  try {
    const payload = JSON.parse(body) as { error?: { message?: unknown }; message?: unknown };
    const providerMessage =
      readNonEmptyString(payload.error?.message) ?? readNonEmptyString(payload.message);
    if (providerMessage) {
      return providerMessage;
    }
  } catch {
    // Use a status-based message when the upstream response is not JSON.
  }

  if (statusCode === 401) {
    return "Your ChatGPT login has expired. Sign in to Codex with ChatGPT again.";
  }
  if (statusCode === 403) {
    return "ChatGPT rejected the transcription request for this Codex session.";
  }

  return `Transcription failed with status ${statusCode}.`;
}

async function transcribeVoice(input: unknown): Promise<VoiceTranscriptResponse> {
  const parsedInput = voiceTranscriptionRequestSchema.parse(input);
  const audioBuffer = decodeVoiceAudio(parsedInput);
  const auth = await resolveChatGptVoiceAuth(parsedInput.cwd?.trim() || process.cwd());
  const response = await requestChatGptTranscription({
    audioBuffer,
    mimeType: parsedInput.audioMimeType,
    token: auth.token,
    transcriptionUrl: auth.transcriptionUrl,
  });

  if (response.statusCode < 200 || response.statusCode >= 300) {
    throw new Error(readProviderError(response.statusCode, response.body));
  }

  const payload = JSON.parse(response.body) as { text?: unknown; transcript?: unknown };
  const text = readNonEmptyString(payload.text) ?? readNonEmptyString(payload.transcript);
  if (!text) {
    throw new Error("The transcription response did not include any text.");
  }

  return voiceTranscriptResponseSchema.parse({
    apiVersion: "v1",
    transcriptionId: randomUUID(),
    provider: "chatgpt-codex-session",
    model: "chatgpt-backend-transcribe",
    mode: "batch",
    status: "completed",
    text,
    durationMs: parsedInput.durationMs,
    createdAt: Date.now(),
  });
}

export function registerVoiceTranscriptionHandler() {
  ipcMain.removeHandler(IPC_CHANNELS.voiceTranscribe);
  ipcMain.handle(IPC_CHANNELS.voiceTranscribe, async (_event, input: unknown) =>
    transcribeVoice(input),
  );
}
