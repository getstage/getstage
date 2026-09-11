import { execFile } from "node:child_process";
import { lookup } from "node:dns/promises";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { request as httpRequest, type IncomingMessage } from "node:http";
import { request as httpsRequest } from "node:https";
import { homedir } from "node:os";
import { resolve, sep } from "node:path";
import { promisify } from "node:util";
import { clipboard, dialog, shell } from "electron";
import {
  projectExportAppsResponseSchema,
  projectExportRequestSchema,
  projectExportResponseSchema,
  type ProjectExportAsset,
  type ProjectExportProvider,
  type ProjectExportRequest,
  type ProjectExportResponse,
} from "@shared/models/desktop";
import { isPrivateIp } from "@shared/models/safeHttpsUrl";
import { augmentPathForProviderClis } from "./cli-path";

const execFileAsync = promisify(execFile);
const MAX_ASSET_BYTES = 25 * 1024 * 1024;
const MAX_TOTAL_ASSET_BYTES = 250 * 1024 * 1024;
const INITIAL_PROMPT =
  "Read AGENTS.md first. Then review every exported project file and relevant asset. Summarize your understanding and propose an implementation plan before changing any files.";

const EXPORT_APP_LABELS: Record<ProjectExportProvider, string> = {
  claude: "Claude Code",
  codex: "Codex",
  cursor: "Cursor",
  vscode: "VS Code",
  zed: "Zed",
  antigravity: "Antigravity",
  windsurf: "Windsurf",
};

const EXPORT_APP_BINARIES: Partial<Record<ProjectExportProvider, string>> = {
  claude: "claude",
  codex: "codex",
};

/** Launch Services names. GUI IDEs never use PATH binaries (agent shims). */
const EXPORT_APP_MAC_NAMES: Record<ProjectExportProvider, readonly string[]> = {
  claude: ["Claude"],
  codex: ["Codex"],
  cursor: ["Cursor"],
  vscode: ["Visual Studio Code"],
  zed: ["Zed"],
  antigravity: ["Antigravity IDE", "Antigravity"],
  windsurf: ["Windsurf"],
};

async function resolveBinary(binary: string): Promise<string | null> {
  const pathValue = augmentPathForProviderClis(process.env.PATH);
  try {
    const result = await execFileAsync("/usr/bin/which", [binary], {
      env: { ...process.env, PATH: pathValue },
    });
    const found = result.stdout.trim();
    return found || null;
  } catch {
    return null;
  }
}

function macAppExists(appName: string) {
  return (
    existsSync(`/Applications/${appName}.app`) ||
    existsSync(`${homedir()}/Applications/${appName}.app`)
  );
}

/** Launch Services, so the app does not have to live in /Applications. */
async function macAppAvailable(appName: string) {
  try {
    await execFileAsync("/usr/bin/open", ["-Ra", appName]);
    return true;
  } catch {
    return macAppExists(appName);
  }
}

function usesGuiApp(id: ProjectExportProvider) {
  return (
    id === "cursor" ||
    id === "vscode" ||
    id === "zed" ||
    id === "antigravity" ||
    id === "windsurf"
  );
}

async function resolveMacAppName(id: ProjectExportProvider): Promise<string | null> {
  for (const name of EXPORT_APP_MAC_NAMES[id]) {
    if (await macAppAvailable(name)) return name;
  }
  return null;
}

export async function listExportApps() {
  const isDarwin = process.platform === "darwin";
  const apps = await Promise.all(
    (Object.keys(EXPORT_APP_LABELS) as ProjectExportProvider[]).map(async (id) => {
      if (!isDarwin) {
        return { id, available: false };
      }
      const binary = EXPORT_APP_BINARIES[id];
      return {
        id,
        available: usesGuiApp(id)
          ? Boolean(await resolveMacAppName(id))
          : Boolean(binary && (await resolveBinary(binary))),
      };
    }),
  );
  return projectExportAppsResponseSchema.parse({ apps });
}

function slugifyProjectName(projectName: string) {
  const slug = projectName
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return slug || "project";
}

function safeDestination(root: string, relativePath: string) {
  const destination = resolve(root, relativePath);
  if (!destination.startsWith(`${root}${sep}`)) {
    throw new Error(`Unsafe export path: ${relativePath}`);
  }
  return destination;
}

async function createUniqueExportDirectory(
  parent: string,
  projectName: string,
) {
  const baseName = `stage-${slugifyProjectName(projectName)}`;
  for (let suffix = 1; suffix <= 100; suffix += 1) {
    const name = suffix === 1 ? baseName : `${baseName}-${suffix}`;
    const directoryPath = resolve(parent, name);
    try {
      await mkdir(directoryPath);
      return directoryPath;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
        throw error;
      }
    }
  }
  throw new Error("Could not create a unique Stage export folder.");
}

function lookupPublic(
  hostname: string,
  _options: unknown,
  callback: (error: Error | null, address: string, family: number) => void,
) {
  void lookup(hostname, { all: true }).then(
    (addresses) => {
      const allowed = addresses.filter(({ address }) => !isPrivateIp(address));
      const chosen = allowed[0];
      if (!chosen) {
        callback(new Error("Private asset addresses are not allowed."), "", 4);
        return;
      }
      callback(null, chosen.address, chosen.family);
    },
    (error: Error) => callback(error, "", 4),
  );
}

async function assertPublicAssetUrl(value: string) {
  const url = new URL(value);
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("Only HTTP assets can be exported.");
  }
  if (url.hostname === "localhost" || url.hostname.endsWith(".local")) {
    throw new Error("Local asset addresses are not allowed.");
  }
  const addresses = await lookup(url.hostname, { all: true });
  if (
    addresses.length === 0 ||
    addresses.some(({ address }) => isPrivateIp(address))
  ) {
    throw new Error("Private asset addresses are not allowed.");
  }
  return url;
}

function collectAssetBody(response: IncomingMessage) {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    let total = 0;
    response.on("data", (chunk: Buffer) => {
      total += chunk.length;
      if (total > MAX_ASSET_BYTES) {
        response.destroy();
        reject(new Error("Asset is larger than 25 MB."));
        return;
      }
      chunks.push(chunk);
    });
    response.on("end", () => resolve(Buffer.concat(chunks)));
    response.on("error", reject);
  });
}

function requestPublicAsset(url: URL) {
  return new Promise<{
    status: number;
    location: string | null;
    body: Buffer;
  }>((resolve, reject) => {
    const request = (url.protocol === "https:" ? httpsRequest : httpRequest)(
      url,
      { method: "GET", lookup: lookupPublic },
      (response) => {
        const status = response.statusCode ?? 0;
        const location = response.headers.location ?? null;
        if (status >= 300 && status < 400) {
          response.resume();
          resolve({ status, location, body: Buffer.alloc(0) });
          return;
        }
        void collectAssetBody(response).then(
          (body) => resolve({ status, location, body }),
          reject,
        );
      },
    );
    request.setTimeout(30_000, () => {
      request.destroy();
      reject(new Error("Asset download timed out."));
    });
    request.on("error", reject);
    request.end();
  });
}

async function fetchAsset(asset: ProjectExportAsset) {
  let url = await assertPublicAssetUrl(asset.url);
  for (let redirects = 0; redirects <= 3; redirects += 1) {
    const response = await requestPublicAsset(url);
    if (response.status >= 300 && response.status < 400) {
      if (!response.location || redirects === 3) {
        throw new Error("Asset redirected too many times.");
      }
      url = await assertPublicAssetUrl(new URL(response.location, url).toString());
      continue;
    }
    if (response.status < 200 || response.status >= 300) {
      throw new Error(`Asset download failed with HTTP ${response.status}.`);
    }
    if (response.body.byteLength > MAX_ASSET_BYTES) {
      throw new Error("Asset is larger than 25 MB.");
    }
    return response.body;
  }
  throw new Error("Asset download failed.");
}

async function writeAssets(
  directoryPath: string,
  assets: ProjectExportAsset[],
) {
  const failedAssets: string[] = [];
  const writtenPaths = new Set<string>();
  let assetCount = 0;
  let totalBytes = 0;
  let cursor = 0;

  async function worker() {
    while (cursor < assets.length) {
      const asset = assets[cursor];
      cursor += 1;
      if (!asset) continue;
      try {
        const bytes = await fetchAsset(asset);
        if (totalBytes + bytes.byteLength > MAX_TOTAL_ASSET_BYTES) {
          throw new Error("The export reached its 250 MB asset limit.");
        }
        totalBytes += bytes.byteLength;
        // Keep the path byte-for-byte identical to the one already written into
        // Markdown. CDN URLs often have no extension; changing the filename here
        // would leave a broken local link in the exported document.
        const destination = safeDestination(directoryPath, asset.relativePath);
        if (writtenPaths.has(destination)) {
          throw new Error("Another exported asset has the same name.");
        }
        writtenPaths.add(destination);
        await mkdir(resolve(destination, ".."), { recursive: true });
        await writeFile(destination, bytes);
        assetCount += 1;
      } catch (error) {
        console.warn("[stage-desktop] project export asset failed", {
          path: asset.relativePath,
          message: error instanceof Error ? error.message : String(error),
        });
        failedAssets.push(asset.relativePath);
      }
    }
  }

  const workerCount = Math.min(4, assets.length);
  await Promise.all(Array.from({ length: workerCount }, worker));
  return { assetCount, failedAssets };
}

async function launchProvider(
  directoryPath: string,
  provider: ProjectExportProvider,
) {
  if (process.platform !== "darwin") {
    throw new Error(
      "Automatic coding-tool launch is currently available on macOS.",
    );
  }

  const pathValue = augmentPathForProviderClis(process.env.PATH);
  const label = EXPORT_APP_LABELS[provider];
  const binaryName = EXPORT_APP_BINARIES[provider];
  const binary = binaryName ? await resolveBinary(binaryName) : null;
  const copiesPrompt = provider !== "claude";

  if (copiesPrompt) {
    clipboard.writeText(INITIAL_PROMPT);
  }

  if (provider === "codex" && binary) {
    await execFileAsync(binary, ["app", directoryPath], {
      env: { ...process.env, PATH: pathValue },
    });
    return;
  }

  if (provider === "claude" && binary) {
    const script = `
on run argv
  set workDirectory to item 1 of argv
  set providerExecutable to item 2 of argv
  set initialPrompt to item 3 of argv
  set shellCommand to "cd " & quoted form of workDirectory & " && exec " & quoted form of providerExecutable & " " & quoted form of initialPrompt
  tell application "Terminal"
    activate
    do script shellCommand
  end tell
end run`;
    await execFileAsync("/usr/bin/osascript", [
      "-e",
      script,
      "--",
      directoryPath,
      binary,
      INITIAL_PROMPT,
    ]);
    return;
  }

  if (usesGuiApp(provider)) {
    const appName = await resolveMacAppName(provider);
    if (!appName) {
      throw new Error(`${label} is not installed or could not be found.`);
    }
    await execFileAsync("/usr/bin/open", ["-a", appName, directoryPath]);
    return;
  }

  throw new Error(`${label} is not installed or could not be found.`);
}

export async function exportStageProject(
  request: ProjectExportRequest,
): Promise<ProjectExportResponse> {
  const parsedRequest = projectExportRequestSchema.parse(request);
  const selection = await dialog.showOpenDialog({
    title: "Choose where Stage should create the project folder",
    buttonLabel: parsedRequest.provider ? "Export and Open" : "Export Project",
    properties: ["openDirectory", "createDirectory"],
  });
  if (selection.canceled || !selection.filePaths[0]) {
    return projectExportResponseSchema.parse({
      cancelled: true,
      fileCount: 0,
      assetCount: 0,
      failedAssets: [],
    });
  }

  const directoryPath = await createUniqueExportDirectory(
    selection.filePaths[0],
    parsedRequest.projectName,
  );
  for (const file of parsedRequest.files) {
    const destination = safeDestination(directoryPath, file.relativePath);
    await mkdir(resolve(destination, ".."), { recursive: true });
    await writeFile(destination, file.content, "utf8");
  }
  const assets = await writeAssets(directoryPath, parsedRequest.assets);

  let launchedProvider: ProjectExportProvider | undefined;
  let launchError: string | undefined;
  if (parsedRequest.provider) {
    try {
      await launchProvider(directoryPath, parsedRequest.provider);
      launchedProvider = parsedRequest.provider;
    } catch (error) {
      launchError =
        error instanceof Error
          ? error.message
          : "Could not open the coding agent.";
      await shell.openPath(directoryPath);
    }
  } else {
    await shell.openPath(directoryPath);
  }

  return projectExportResponseSchema.parse({
    cancelled: false,
    directoryPath,
    fileCount: parsedRequest.files.length,
    assetCount: assets.assetCount,
    failedAssets: assets.failedAssets,
    launchedProvider,
    launchError,
  });
}
