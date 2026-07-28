import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import type { ChildProcessByStdio } from "node:child_process";
import type { Readable } from "node:stream";
import { app } from "electron";
import { augmentPathForProviderClis } from "./cli-path";
import { shouldLogDesktopVerbose } from "./desktop-log";
import {
  ENGINE_DEFAULT_PORT,
  ENGINE_READINESS_ATTEMPTS,
  ENGINE_READINESS_INTERVAL_MS,
  ENGINE_READINESS_TIMEOUT_MS,
  ENGINE_REQUEST_TIMEOUT_MS,
} from "./engine-constants";
import { delay } from "./time";

export type SidecarChildProcess = ChildProcessByStdio<null, Readable, Readable>;

type ReadinessResponse = {
  apiVersion: "v1";
  ready: boolean;
  service: string;
};

function isStageEngineReadiness(value: unknown): value is ReadinessResponse {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    record.apiVersion === "v1" &&
    typeof record.ready === "boolean" &&
    record.service === "stage-engine"
  );
}

export function getSidecarPort() {
  const raw = process.env.STAGE_ENGINE_PORT;
  const parsed = raw ? Number.parseInt(raw, 10) : ENGINE_DEFAULT_PORT;

  return Number.isInteger(parsed) && parsed > 0 ? parsed : ENGINE_DEFAULT_PORT;
}

export function getSidecarEnv(port: number): NodeJS.ProcessEnv {
  const convexUrl =
    process.env.CONVEX_URL ??
    process.env.VITE_CONVEX_URL ??
    (app.isPackaged ? undefined : "https://reliable-bullfrog-917.convex.cloud");

  const r2PublicBaseUrl =
    process.env.R2_PUBLIC_BASE_URL ??
    (app.isPackaged ? undefined : "https://assets-testing.getstage.co");
  const wireframeRendererRoot = app.isPackaged
    ? resolve(process.resourcesPath, "wireframe-renderer")
    : resolve(app.getAppPath(), "../..", "packages/wireframe-renderer");

  return {
    ...process.env,
    PATH: augmentPathForProviderClis(process.env.PATH),
    STAGE_ENGINE_PORT: String(port),
    STAGE_WIREFRAME_NODE_BINARY: process.execPath,
    STAGE_WIREFRAME_RENDERER_ROOT: wireframeRendererRoot,
    ...(convexUrl ? { CONVEX_URL: convexUrl } : {}),
    ...(r2PublicBaseUrl ? { R2_PUBLIC_BASE_URL: r2PublicBaseUrl } : {}),
  };
}

export function findStageEngineManifest() {
  if (process.env.STAGE_ENGINE_MANIFEST) {
    return process.env.STAGE_ENGINE_MANIFEST;
  }

  const candidates = [
    resolve(app.getAppPath(), "..", "..", "apps/stage-engine/Cargo.toml"),
    resolve(process.cwd(), "..", "..", "apps/stage-engine/Cargo.toml"),
    resolve(process.cwd(), "apps/stage-engine/Cargo.toml"),
  ];

  return candidates.find((candidate) => existsSync(candidate)) ?? candidates[0];
}

export async function fetchReadiness(port: number): Promise<ReadinessResponse | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ENGINE_READINESS_TIMEOUT_MS);

  try {
    const response = await fetch(`http://127.0.0.1:${port}/v1/readiness`, {
      signal: controller.signal,
    });

    if (!response.ok) {
      return null;
    }

    const payload = await response.json();
    return isStageEngineReadiness(payload) ? payload : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchEngineJson<T>(args: {
  method?: "GET" | "POST";
  path: string;
  port: number;
  body?: unknown;
  accessToken?: string | null;
  timeoutMs?: number;
}): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    args.timeoutMs ?? ENGINE_REQUEST_TIMEOUT_MS,
  );

  try {
    const headers: Record<string, string> = {};
    if (args.body !== undefined) {
      headers["content-type"] = "application/json";
    }
    if (args.accessToken) {
      headers.authorization = `Bearer ${args.accessToken}`;
    }

    const response = await fetch(`http://127.0.0.1:${args.port}${args.path}`, {
      method: args.method ?? "GET",
      body: args.body === undefined ? undefined : JSON.stringify(args.body),
      headers: Object.keys(headers).length === 0 ? undefined : headers,
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = (await response.text()).trim();
      throw new Error(
        body
          ? `Stage Engine request failed with ${response.status}: ${body}`
          : `Stage Engine request failed with ${response.status}.`,
      );
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(
        `Stage Engine request timed out after ${args.timeoutMs ?? ENGINE_REQUEST_TIMEOUT_MS}ms.`,
      );
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function waitForReadiness(port: number) {
  for (let attempt = 0; attempt < ENGINE_READINESS_ATTEMPTS; attempt += 1) {
    const readiness = await fetchReadiness(port);

    if (readiness?.apiVersion === "v1" && readiness.ready) {
      return readiness;
    }

    await delay(ENGINE_READINESS_INTERVAL_MS);
  }

  throw new Error(`Stage Engine did not become ready on port ${port}.`);
}

/** Reap whatever is listening on the engine port (stale cargo run, zombie sidecar). */
export function killProcessOnPort(port: number) {
  if (process.platform === "win32") {
    return;
  }

  try {
    const output = execSync(`lsof -t -iTCP:${port} -sTCP:LISTEN`, { encoding: "utf8" }).trim();
    if (!output) {
      return;
    }

    for (const pidText of output.split("\n")) {
      const pid = Number.parseInt(pidText, 10);
      if (Number.isInteger(pid) && pid > 0) {
        try {
          process.kill(pid, "SIGTERM");
        } catch {
          // Process may have already exited.
        }
      }
    }
  } catch {
    // Nothing listening on the port.
  }
}

export function logSidecarOutput(streamName: "stdout" | "stderr", chunk: Buffer | string) {
  const verbose = shouldLogDesktopVerbose();

  String(chunk)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      if (!verbose) {
        if (streamName !== "stderr") {
          return;
        }
        if (!/\b(WARN|ERROR|panic|Fatal)\b/i.test(line)) {
          return;
        }
      }

      const logger = streamName === "stderr" ? console.warn : console.info;
      logger(`[stage-engine] ${line}`);
    });
}

export function waitForExit(child: SidecarChildProcess) {
  return new Promise<void>((resolveWait) => {
    if (child.exitCode !== null || child.signalCode !== null) {
      resolveWait();
      return;
    }

    child.once("exit", () => resolveWait());
  });
}
