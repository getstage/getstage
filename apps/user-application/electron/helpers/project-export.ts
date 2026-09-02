import { execFile } from "node:child_process";
import { lookup } from "node:dns/promises";
import { mkdir, writeFile } from "node:fs/promises";
import { isIP } from "node:net";
import { extname, resolve, sep } from "node:path";
import { promisify } from "node:util";
import { dialog, shell } from "electron";
import {
  projectExportRequestSchema,
  projectExportResponseSchema,
  type ProjectExportAsset,
  type ProjectExportProvider,
  type ProjectExportRequest,
  type ProjectExportResponse,
} from "@shared/models/desktop";
import { augmentPathForProviderClis } from "./cli-path";

const execFileAsync = promisify(execFile);
const MAX_ASSET_BYTES = 25 * 1024 * 1024;
const MAX_TOTAL_ASSET_BYTES = 250 * 1024 * 1024;
const INITIAL_PROMPT =
  "Read AGENTS.md first. Then review every exported project file and relevant asset. Summarize your understanding and propose an implementation plan before changing any files.";

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

function isPrivateIp(address: string) {
  if (isIP(address) === 4) {
    const [a = 0, b = 0] = address.split(".").map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a >= 224
    );
  }
  if (isIP(address) === 6) {
    const normalized = address.toLowerCase();
    return (
      normalized === "::" ||
      normalized === "::1" ||
      normalized.startsWith("fe80:") ||
      normalized.startsWith("fc") ||
      normalized.startsWith("fd") ||
      normalized.startsWith("::ffff:127.") ||
      normalized.startsWith("::ffff:10.") ||
      normalized.startsWith("::ffff:192.168.")
    );
  }
  return false;
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

async function fetchAsset(asset: ProjectExportAsset) {
  let url = await assertPublicAssetUrl(asset.url);
  for (let redirects = 0; redirects <= 3; redirects += 1) {
    const response = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(30_000),
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location || redirects === 3) {
        throw new Error("Asset redirected too many times.");
      }
      url = await assertPublicAssetUrl(new URL(location, url).toString());
      continue;
    }
    if (!response.ok) {
      throw new Error(`Asset download failed with HTTP ${response.status}.`);
    }
    const declaredSize = Number(response.headers.get("content-length") ?? 0);
    if (declaredSize > MAX_ASSET_BYTES) {
      throw new Error("Asset is larger than 25 MB.");
    }
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.byteLength > MAX_ASSET_BYTES) {
      throw new Error("Asset is larger than 25 MB.");
    }
    return { bytes, contentType: response.headers.get("content-type") };
  }
  throw new Error("Asset download failed.");
}

function extensionFor(contentType: string | null) {
  const mimeType = contentType?.split(";", 1)[0]?.trim().toLowerCase();
  return (
    {
      "image/jpeg": ".jpg",
      "image/png": ".png",
      "image/webp": ".webp",
      "image/gif": ".gif",
      "image/svg+xml": ".svg",
      "application/pdf": ".pdf",
    }[mimeType ?? ""] ?? ".asset"
  );
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
        const downloaded = await fetchAsset(asset);
        if (totalBytes + downloaded.bytes.byteLength > MAX_TOTAL_ASSET_BYTES) {
          throw new Error("The export reached its 250 MB asset limit.");
        }
        totalBytes += downloaded.bytes.byteLength;
        const relativePath = extname(asset.relativePath)
          ? asset.relativePath
          : `${asset.relativePath}${extensionFor(downloaded.contentType)}`;
        const destination = safeDestination(directoryPath, relativePath);
        if (writtenPaths.has(destination)) {
          throw new Error("Another exported asset has the same name.");
        }
        writtenPaths.add(destination);
        await mkdir(resolve(destination, ".."), { recursive: true });
        await writeFile(destination, downloaded.bytes);
        assetCount += 1;
      } catch {
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
      "Automatic Claude Code and Codex launch is currently available on macOS.",
    );
  }
  const pathValue = augmentPathForProviderClis(process.env.PATH);
  try {
    await execFileAsync("/usr/bin/which", [provider], {
      env: { ...process.env, PATH: pathValue },
    });
  } catch {
    const productName = provider === "claude" ? "Claude Code" : "Codex";
    throw new Error(`${productName} is not installed or could not be found.`);
  }

  const script = `
on run argv
  set workDirectory to item 1 of argv
  set providerCommand to item 2 of argv
  set initialPrompt to item 3 of argv
  set providerPath to item 4 of argv
  set shellCommand to "cd " & quoted form of workDirectory & " && PATH=" & quoted form of providerPath & " exec " & providerCommand & " " & quoted form of initialPrompt
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
    provider,
    INITIAL_PROMPT,
    pathValue,
  ]);
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
