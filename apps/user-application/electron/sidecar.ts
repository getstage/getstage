import { spawn } from "node:child_process";
import { accessSync, chmodSync, constants, existsSync } from "node:fs";
import { dirname } from "node:path";
import type { EngineStatus } from "@shared/models/desktop";
import { getPackagedStageEngineBinaryPath } from "./helpers/stage-engine-binary";
import {
  DEFAULT_PORT,
  SHUTDOWN_TIMEOUT_MS,
  fetchReadiness,
  findStageEngineManifest,
  getSidecarEnv,
  getSidecarPort,
  logSidecarOutput,
  type SidecarChildProcess,
  waitForExit,
  waitForReadiness,
} from "./helpers/sidecar";
import { logDesktopDebug, logDesktopInfo, logDesktopWarn } from "./helpers/desktop-log";
import { delay } from "./helpers/time";

/** Stop spawned engine after this idle period once no engine IPC or active streams remain. */
export const ENGINE_IDLE_SHUTDOWN_MS = 7 * 60 * 1000;

export class SidecarSupervisor {
  private child: SidecarChildProcess | null = null;
  private status: EngineStatus = {
    adopted: false,
    pid: null,
    port: DEFAULT_PORT,
    state: "idle",
  };
  private lastEngineActivityAt = 0;
  private idleShutdownHoldCount = 0;
  private idleShutdownTimer: ReturnType<typeof setTimeout> | null = null;
  private stopPromise: Promise<EngineStatus> | null = null;

  getStatus(): EngineStatus {
    return { ...this.status };
  }

  async getLiveStatus(): Promise<EngineStatus> {
    if (this.status.state !== "ready" && this.status.state !== "starting") {
      return this.getStatus();
    }

    const readiness = await fetchReadiness(this.status.port);
    if (readiness?.ready) {
      return this.getStatus();
    }

    this.child = null;
    this.status = {
      adopted: false,
      error: `Stage Engine is not responding on port ${this.status.port}.`,
      pid: null,
      port: this.status.port,
      state: "failed",
    };

    return this.getStatus();
  }

  markEngineActivity() {
    this.lastEngineActivityAt = Date.now();
    this.scheduleIdleShutdown();
  }

  holdIdleShutdown() {
    this.idleShutdownHoldCount += 1;
    this.clearIdleShutdownTimer();
  }

  releaseIdleShutdown() {
    this.idleShutdownHoldCount = Math.max(0, this.idleShutdownHoldCount - 1);
    this.scheduleIdleShutdown();
  }

  async start() {
    if (this.stopPromise) {
      await this.stopPromise;
    }

    if (this.status.state === "ready" || this.status.state === "starting") {
      logDesktopDebug(`sidecar start joined existing state=${this.status.state} port=${this.status.port}`);
      this.markEngineActivity();
      return this.getStatus();
    }

    const startedAt = Date.now();
    const port = getSidecarPort();
    this.status = { adopted: false, pid: null, port, state: "starting" };
    logDesktopDebug(`sidecar start requested port=${port}`);

    const existingReadiness = await fetchReadiness(port);

    if (existingReadiness?.ready) {
      this.status = { adopted: true, pid: null, port, state: "ready" };
      logDesktopWarn(
        "stage-engine",
        `using existing service on port ${port} — restart it after Rust changes (kill $(lsof -t -i:${port}))`,
      );
      logDesktopDebug(`sidecar adopted existing service in ${Date.now() - startedAt}ms`);
      this.markEngineActivity();
      return this.getStatus();
    }

    const packagedBinary = getPackagedStageEngineBinaryPath();
    const sidecarEnv = getSidecarEnv(port);
    let child: SidecarChildProcess;

    try {
      child = packagedBinary
        ? spawnPackagedEngine(packagedBinary, sidecarEnv)
        : spawnDevEngine(sidecarEnv);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown sidecar startup error.";
      this.status = { adopted: false, error: message, pid: null, port, state: "failed" };
      throw error;
    }

    this.child = child;
    this.status = { adopted: false, pid: child.pid ?? null, port, state: "starting" };
    logDesktopDebug(`sidecar spawned pid=${child.pid ?? "unknown"} after ${Date.now() - startedAt}ms`);

    child.stdout.on("data", (chunk: Buffer | string) => logSidecarOutput("stdout", chunk));
    child.stderr.on("data", (chunk: Buffer | string) => logSidecarOutput("stderr", chunk));
    const spawnError = new Promise<never>((_resolve, reject) => {
      child.once("error", reject);
    });

    child.once("exit", (code, signal) => {
      if (this.child !== child) {
        return;
      }

      if (this.status.state === "stopping") {
        return;
      }

      const error = `Stage Engine exited unexpectedly with code ${code ?? "null"} and signal ${signal ?? "null"}.`;
      this.child = null;
      this.status = {
        adopted: false,
        error,
        pid: null,
        port,
        state: "failed",
      };
      logDesktopWarn("stage-engine", error);
    });

    try {
      await Promise.race([waitForReadiness(port), spawnError]);
      this.status = { adopted: false, pid: child.pid ?? null, port, state: "ready" };
      logDesktopInfo("stage-engine", `ready on port ${port}`);
      logDesktopDebug(`sidecar ready in ${Date.now() - startedAt}ms`);
      this.markEngineActivity();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown sidecar startup error.";
      this.status = { adopted: false, error: message, pid: child.pid ?? null, port, state: "failed" };
      if (child.exitCode === null && child.signalCode === null) {
        child.kill("SIGTERM");
      }
      logDesktopDebug(`sidecar failed in ${Date.now() - startedAt}ms`);
      throw error;
    }

    return this.getStatus();
  }

  async stop() {
    if (!this.stopPromise) {
      this.stopPromise = this.runStop().finally(() => {
        this.stopPromise = null;
      });
    }

    return this.stopPromise;
  }

  private async runStop() {
    this.clearIdleShutdownTimer();

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

    this.scheduleIdleShutdown();
    return this.getStatus();
  }

  private clearIdleShutdownTimer() {
    if (this.idleShutdownTimer) {
      clearTimeout(this.idleShutdownTimer);
      this.idleShutdownTimer = null;
    }
  }

  private scheduleIdleShutdown() {
    this.clearIdleShutdownTimer();

    if (this.idleShutdownHoldCount > 0) {
      return;
    }

    if (this.status.state !== "ready" || (!this.child && !this.status.adopted)) {
      return;
    }

    const idleForMs = Date.now() - this.lastEngineActivityAt;
    const remainingMs = ENGINE_IDLE_SHUTDOWN_MS - idleForMs;

    if (remainingMs <= 0) {
      void this.stopForIdle();
      return;
    }

    this.idleShutdownTimer = setTimeout(() => {
      void this.stopForIdle();
    }, remainingMs);

    if (typeof this.idleShutdownTimer.unref === "function") {
      this.idleShutdownTimer.unref();
    }
  }

  private async stopForIdle() {
    if (this.idleShutdownHoldCount > 0) {
      return;
    }

    if (Date.now() - this.lastEngineActivityAt < ENGINE_IDLE_SHUTDOWN_MS) {
      this.scheduleIdleShutdown();
      return;
    }

    if (this.status.state !== "ready" || this.status.adopted || !this.child) {
      return;
    }

    logDesktopDebug("sidecar idle shutdown after engine inactivity");
    logDesktopInfo("stage-engine", "stopping after idle timeout");
    await this.stop();

    if (this.idleShutdownHoldCount > 0) {
      return;
    }
  }
}

export function createSidecarSupervisor() {
  return new SidecarSupervisor();
}

function spawnPackagedEngine(binaryPath: string, env: NodeJS.ProcessEnv) {
  try {
    chmodSync(binaryPath, 0o755);
  } catch (error) {
    const message = error instanceof Error ? error.message : "chmod failed";
    try {
      accessSync(binaryPath, constants.X_OK);
      logDesktopDebug(`[stage-engine] could not chmod binary (${message}); continuing because it is executable`);
    } catch {
      throw new Error(`Stage Engine binary is not executable at ${binaryPath}.`);
    }
  }
  logDesktopInfo("stage-engine", `starting packaged binary at ${binaryPath}`);
  return spawn(binaryPath, [], {
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function spawnDevEngine(env: NodeJS.ProcessEnv) {
  const manifestPath = findStageEngineManifest();

  if (!existsSync(manifestPath)) {
    throw new Error(`Stage Engine manifest not found at ${manifestPath}.`);
  }

  logDesktopInfo("stage-engine", `starting dev cargo run (${manifestPath})`);
  return spawn("cargo", ["run", "--manifest-path", manifestPath], {
    cwd: dirname(manifestPath),
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
}
