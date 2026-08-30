const MAX_SOURCE_BYTES = 1_000_000;
const MAX_SOURCE_FILES = 128;
const MAX_SEARCH_CHARACTERS = 24_000;

export type CatalogRuntime = "client" | "universal";

export type CatalogSourceFile = {
  path: string;
  content: string;
};

export type CatalogSourceBundle = {
  files: CatalogSourceFile[];
  css?: string;
  dependencies: string[];
  registryDependencies: string[];
  runtime: CatalogRuntime;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function safePath(value: unknown) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replaceAll("\\", "/").replace(/^\.\//, "");
  if (
    !normalized ||
    normalized.startsWith("/") ||
    normalized.includes("\0") ||
    normalized.split("/").some((segment) => segment === "..") ||
    /^[a-zA-Z]:\//.test(normalized)
  ) {
    return null;
  }
  return normalized;
}

function sourceFiles(rawFiles: unknown): CatalogSourceFile[] {
  if (Array.isArray(rawFiles)) {
    return rawFiles.flatMap((value) => {
      const file = asRecord(value);
      const path = [file?.target, file?.path, file?.name]
        .map(safePath)
        .find((candidate) => candidate !== null);
      const content = file?.content;
      return path && typeof content === "string" && content.trim()
        ? [{ path, content }]
        : [];
    });
  }

  const files = asRecord(rawFiles);
  if (!files) return [];
  return Object.entries(files).flatMap(([candidatePath, value]) => {
    const file = asRecord(value);
    const path = [file?.target, file?.path, candidatePath]
      .map(safePath)
      .find((candidate) => candidate !== null);
    const content = typeof value === "string" ? value : file?.content;
    return path && typeof content === "string" && content.trim()
      ? [{ path, content }]
      : [];
  });
}

function stringList(value: unknown) {
  if (Array.isArray(value)) {
    return value.filter(
      (item): item is string =>
        typeof item === "string" && Boolean(item.trim()),
    );
  }
  const record = asRecord(value);
  return record ? Object.keys(record) : [];
}

function optionalCss(value: unknown) {
  if (typeof value === "string" && value.trim()) return value;
  const record = asRecord(value);
  return record ? JSON.stringify(record) : undefined;
}

export function parseCatalogSource(raw: unknown): CatalogSourceBundle {
  const record = asRecord(raw);
  if (!record) throw new Error("Catalog source must be a JSON object.");

  const files = sourceFiles(record.files);
  if (files.length === 0)
    throw new Error("Catalog source has no usable source files.");
  if (files.length > MAX_SOURCE_FILES)
    throw new Error("Catalog source contains too many files.");

  const sourceBytes = files.reduce(
    (total, file) =>
      total +
      file.path.length +
      new TextEncoder().encode(file.content).byteLength,
    0,
  );
  if (sourceBytes > MAX_SOURCE_BYTES)
    throw new Error("Catalog source exceeds the source limit.");

  const runtime = files.some((file) =>
    /(^|\n)\s*["']use client["'];?/.test(file.content),
  )
    ? "client"
    : "universal";

  return {
    files,
    css: optionalCss(record.css),
    dependencies: stringList(record.dependencies),
    registryDependencies: stringList(record.registryDependencies),
    runtime,
  };
}

export function buildCatalogSearchText(
  component: { library: string; name: string; kind: string },
  source: CatalogSourceBundle,
) {
  const header = [
    `Library: ${component.library}`,
    `Component: ${component.name}`,
    `Kind: ${component.kind}`,
    `Runtime: ${source.runtime}`,
    `Dependencies: ${source.dependencies.join(", ") || "none"}`,
    `Files: ${source.files.map((file) => file.path).join(", ")}`,
  ].join("\n");
  const code = source.files
    .map((file) => `\n## ${file.path}\n${file.content}`)
    .join("\n");
  return `${header}\n${code}`.slice(0, MAX_SEARCH_CHARACTERS);
}

export async function fetchCatalogSource(key: string) {
  const { r2 } = await import("../r2/domain");
  const response = await fetch(await r2.getUrl(key, { expiresIn: 60 }));
  if (!response.ok)
    throw new Error(
      `Catalog source fetch failed with status ${response.status}.`,
    );
  const text = await response.text();
  if (new TextEncoder().encode(text).byteLength > MAX_SOURCE_BYTES) {
    throw new Error("Catalog source response exceeds the source limit.");
  }
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("Catalog source is not valid JSON.");
  }
  return parseCatalogSource(raw);
}
