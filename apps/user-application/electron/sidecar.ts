import { spawn, type ChildProcessByStdio } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { Readable } from "node:stream";
import { app } from "electron";
import type { EngineStatus } from "@shared/models/desktop";

type SidecarChildProcess = ChildProcessByStdio<null, Readable, Readable>;

type ReadinessResponse = {
  apiVersion: "v1";
  ready: boolean;
  service: string;
};

const DEFAULT_PORT = 48_221;
const READINESS_ATTEMPTS = 40;
const READINESS_INTERVAL_MS = 250;
const READINESS_TIMEOUT_MS = 350;
const SHUTDOWN_TIMEOUT_MS = 1_500;

function delay(ms: number) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, ms));
}

function getPort() {
  const raw = process.env.STAGE_ENGINE_PORT;
  const parsed = raw ? Number.parseInt(raw, 10) : DEFAULT_PORT;

  return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_PORT;
}

function findDataServiceManifest() {
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

async function fetchReadiness(port: number): Promise<ReadinessResponse | null> {
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

async function waitForReadiness(port: number) {
  for (let attempt = 0; attempt < READINESS_ATTEMPTS; attempt += 1) {
    const readiness = await fetchReadiness(port);

    if (readiness?.apiVersion === "v1" && readiness.ready) {
      return readiness;
    }

    await delay(READINESS_INTERVAL_MS);
  }

  throw new Error(`Stage data service did not become ready on port ${port}.`);
}

function logSidecarOutput(streamName: "stdout" | "stderr", chunk: Buffer | string) {
  String(chunk)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      const logger = streamName === "stderr" ? console.warn : console.info;
      logger(`[stage-data-service] ${line}`);
    });
}

function waitForExit(child: SidecarChildProcess) {
  return new Promise<void>((resolveWait) => {
    if (child.exitCode !== null || child.signalCode !== null) {
      resolveWait();
      return;
    }

    child.once("exit", () => resolveWait());
  });
}

export class SidecarSupervisor {
  private child: SidecarChildProcess | null = null;
  private status: EngineStatus = {
    adopted: false,
    pid: null,
    port: DEFAULT_PORT,
    state: "idle",
  };

  getStatus(): EngineStatus {
    return { ...this.status };
  }

  async start() {
    if (this.status.state === "ready" || this.status.state === "starting") {
      return this.getStatus();
    }

    const port = getPort();
    this.status = { adopted: false, pid: null, port, state: "starting" };

    const existingReadiness = await fetchReadiness(port);

    if (existingReadiness?.ready) {
      this.status = { adopted: true, pid: null, port, state: "ready" };
      console.info(`[stage-data-service] using existing service on port ${port}`);
      return this.getStatus();
    }

    const manifestPath = findDataServiceManifest();

    if (!existsSync(manifestPath)) {
      const error = `Stage data service manifest not found at ${manifestPath}.`;
      this.status = { adopted: false, error, pid: null, port, state: "failed" };
      throw new Error(error);
    }

    const child = spawn("cargo", ["run", "--manifest-path", manifestPath], {
      cwd: dirname(manifestPath),
      env: {
        ...process.env,
        STAGE_ENGINE_PORT: String(port),
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

    this.child = child;
    this.status = { adopted: false, pid: child.pid ?? null, port, state: "starting" };

    child.stdout.on("data", (chunk: Buffer | string) => logSidecarOutput("stdout", chunk));
    child.stderr.on("data", (chunk: Buffer | string) => logSidecarOutput("stderr", chunk));
    const spawnError = new Promise<never>((_resolve, reject) => {
      child.once("error", reject);
    });

    child.once("exit", (code, signal) => {
      if (this.status.state === "stopping") {
        return;
      }

      const error = `Stage data service exited unexpectedly with code ${code ?? "null"} and signal ${signal ?? "null"}.`;
      this.child = null;
      this.status = {
        adopted: false,
        error,
        pid: null,
        port,
        state: "failed",
      };
      console.warn(`[stage-data-service] ${error}`);
    });

    try {
      await Promise.race([waitForReadiness(port), spawnError]);
      this.status = { adopted: false, pid: child.pid ?? null, port, state: "ready" };
      console.info(`[stage-data-service] ready on port ${port}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown sidecar startup error.";
      this.status = { adopted: false, error: message, pid: child.pid ?? null, port, state: "failed" };
      if (child.exitCode === null && child.signalCode === null) {
        child.kill("SIGTERM");
      }
      throw error;
    }

    return this.getStatus();
  }

  async stop() {
    if (!this.child || this.status.adopted) {
      this.status = {
        ...this.status,
        pid: null,
        state: this.status.state === "failed" ? "failed" : "stopped",
      };
      return this.getStatus();
    }

    const child = this.child;
    this.status = { ...this.status, state: "stopping" };
    child.kill("SIGTERM");

    const exited = await Promise.race([
      waitForExit(child).then(() => true),
      delay(SHUTDOWN_TIMEOUT_MS).then(() => false),
    ]);

    if (!exited && child.exitCode === null && child.signalCode === null) {
      child.kill("SIGKILL");
      await waitForExit(child);
    }

    this.child = null;
    this.status = {
      adopted: false,
      pid: null,
      port: this.status.port,
      state: "stopped",
    };

    return this.getStatus();
  }
}

export function createSidecarSupervisor() {
  return new SidecarSupervisor();
}
