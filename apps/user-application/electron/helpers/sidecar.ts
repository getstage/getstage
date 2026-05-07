import { existsSync } from "node:fs";
import { resolve } from "node:path";
import type { ChildProcessByStdio } from "node:child_process";
import type { Readable } from "node:stream";
import { app } from "electron";
import { delay } from "./time";

export type SidecarChildProcess = ChildProcessByStdio<null, Readable, Readable>;

type ReadinessResponse = {
  apiVersion: "v1";
  ready: boolean;
  service: string;
};

export const DEFAULT_PORT = 48_221;
export const READINESS_ATTEMPTS = 40;
export const READINESS_INTERVAL_MS = 250;
export const READINESS_TIMEOUT_MS = 350;
export const SHUTDOWN_TIMEOUT_MS = 1_500;

export function getSidecarPort() {
  const raw = process.env.STAGE_ENGINE_PORT;
  const parsed = raw ? Number.parseInt(raw, 10) : DEFAULT_PORT;

  return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_PORT;
}

export function findDataServiceManifest() {
  if (process.env.STAGE_DATA_SERVICE_MANIFEST) {
    return process.env.STAGE_DATA_SERVICE_MANIFEST;
  }

  const candidates = [
    resolve(app.getAppPath(), "..", "..", "apps/data-service/Cargo.toml"),
    resolve(process.cwd(), "..", "..", "apps/data-service/Cargo.toml"),
    resolve(process.cwd(), "apps/data-service/Cargo.toml"),
  ];

  return candidates.find((candidate) => existsSync(candidate)) ?? candidates[0];
}

export async function fetchReadiness(port: number): Promise<ReadinessResponse | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), READINESS_TIMEOUT_MS);

  try {
    const response = await fetch(`http://127.0.0.1:${port}/v1/readiness`, {
      signal: controller.signal,
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as ReadinessResponse;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function waitForReadiness(port: number) {
  for (let attempt = 0; attempt < READINESS_ATTEMPTS; attempt += 1) {
    const readiness = await fetchReadiness(port);

    if (readiness?.apiVersion === "v1" && readiness.ready) {
      return readiness;
    }

    await delay(READINESS_INTERVAL_MS);
  }

  throw new Error(`Stage data service did not become ready on port ${port}.`);
}

export function logSidecarOutput(streamName: "stdout" | "stderr", chunk: Buffer | string) {
  String(chunk)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      const logger = streamName === "stderr" ? console.warn : console.info;
      logger(`[stage-data-service] ${line}`);
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
