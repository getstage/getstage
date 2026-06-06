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
import { delay } from "./helpers/time";

const shouldLogDesktopDebug =
  process.env.STAGE_DESKTOP_DEBUG === "1" ||
  (process.env.NODE_ENV === "development" && process.env.STAGE_DESKTOP_DEBUG !== "0");

function debugDesktop(message: string) {
  if (shouldLogDesktopDebug) {
    console.info(`[stage-desktop:debug] ${message}`);
  }
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

  async start() {
    if (this.status.state === "ready" || this.status.state === "starting") {
      debugDesktop(`sidecar start joined existing state=${this.status.state} port=${this.status.port}`);
      return this.getStatus();
    }

    const startedAt = Date.now();
    const port = getSidecarPort();
    this.status = { adopted: false, pid: null, port, state: "starting" };
    debugDesktop(`sidecar start requested port=${port}`);

    const existingReadiness = await fetchReadiness(port);

    if (existingReadiness?.ready) {
      this.status = { adopted: true, pid: null, port, state: "ready" };
      console.warn(
        `[stage-engine] using existing service on port ${port} — restart it after Rust changes (kill $(lsof -t -i:${port}))`,
      );
      debugDesktop(`sidecar adopted existing service in ${Date.now() - startedAt}ms`);
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
    debugDesktop(`sidecar spawned pid=${child.pid ?? "unknown"} after ${Date.now() - startedAt}ms`);

    child.stdout.on("data", (chunk: Buffer | string) => logSidecarOutput("stdout", chunk));
    child.stderr.on("data", (chunk: Buffer | string) => logSidecarOutput("stderr", chunk));
    const spawnError = new Promise<never>((_resolve, reject) => {
      child.once("error", reject);
    });

    child.once("exit", (code, signal) => {
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
      console.warn(`[stage-engine] ${error}`);
    });

    try {
      await Promise.race([waitForReadiness(port), spawnError]);
      this.status = { adopted: false, pid: child.pid ?? null, port, state: "ready" };
      console.info(`[stage-engine] ready on port ${port}`);
      debugDesktop(`sidecar ready in ${Date.now() - startedAt}ms`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown sidecar startup error.";
      this.status = { adopted: false, error: message, pid: child.pid ?? null, port, state: "failed" };
      if (child.exitCode === null && child.signalCode === null) {
        child.kill("SIGTERM");
      }
      debugDesktop(`sidecar failed in ${Date.now() - startedAt}ms`);
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

function spawnPackagedEngine(binaryPath: string, env: NodeJS.ProcessEnv) {
  try {
    chmodSync(binaryPath, 0o755);
  } catch (error) {
    const message = error instanceof Error ? error.message : "chmod failed";
    try {
      accessSync(binaryPath, constants.X_OK);
      console.warn(`[stage-engine] could not chmod binary (${message}); continuing because it is executable`);
    } catch {
      throw new Error(`Stage Engine binary is not executable at ${binaryPath}.`);
    }
  }
  console.info(`[stage-engine] starting packaged binary at ${binaryPath}`);
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

  console.info(`[stage-engine] starting dev cargo run (${manifestPath})`);
  return spawn("cargo", ["run", "--manifest-path", manifestPath], {
    cwd: dirname(manifestPath),
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
}
