import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname } from "node:path";
import type { EngineStatus } from "@shared/models/desktop";
import {
  DEFAULT_PORT,
  SHUTDOWN_TIMEOUT_MS,
  fetchReadiness,
  findDataServiceManifest,
  getSidecarPort,
  logSidecarOutput,
  type SidecarChildProcess,
  waitForExit,
  waitForReadiness,
} from "./helpers/sidecar";
import { delay } from "./helpers/time";

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

    const port = getSidecarPort();
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
