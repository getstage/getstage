import { referenceUpstream, type ReferenceSource } from "../../integrations/referenceProxy";

// Refero screen search and screenshots for the backend (MCP moodboard imports), with Stage's key.
// Port of the engine's Refero client (`apps/stage-engine/src/refero/{client,service,parse}.rs`).
// The MCP call and result helpers are shared with Details (`./details.ts`).

export type ReferoScreen = {
  id: string;
  title: string;
  productName?: string;
  sourceUrl?: string;
  thumbnailUrl?: string;
  imageUrl?: string;
};

export type ReferoPlatform = "web" | "ios" | "android";

const MAX_SEARCH_RESULTS = 12;

export type Json = unknown;
export type JsonObject = Record<string, Json>;

export function isObject(value: Json): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Calls a tool on Refero's or Details' MCP server with Stage's key. */
export async function callReferenceTool(source: ReferenceSource, name: string, args: JsonObject): Promise<Json> {
  const upstream = referenceUpstream(source);
  const label = source === "refero" ? "Refero" : "Details";
  if (!upstream) throw new Error(`${label} is not configured for this Stage deployment.`);
  const response = await fetch(upstream.url, {
    method: "POST",
    headers: { Authorization: `Bearer ${upstream.token}`, "Content-Type": "application/json", Accept: "application/json, text/event-stream" },
    body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method: "tools/call", params: { name, arguments: args } }),
  });
  if (!response.ok) throw new Error(`${label} request failed with status ${response.status}.`);
  const body = (await response.json()) as { result?: Json; error?: { message?: string } };
  if (body.error) throw new Error(`${label} tool call failed: ${body.error.message ?? "unknown error"}`);
  return body.result ?? null;
}

/** MCP tool results put JSON in `structuredContent` or in text content; returns that JSON. */
export function unwrapToolResult(raw: Json): Json {
  if (!isObject(raw)) return raw;
  if ("structuredContent" in raw) return raw.structuredContent;
  if ("result" in raw) return unwrapToolResult(raw.result);
  if (Array.isArray(raw.content)) {
    const text = raw.content.map((item) => (isObject(item) && typeof item.text === "string" ? item.text : "")).join("").trim();
    if (text) {
      try {
        return JSON.parse(text) as Json;
      } catch {
        // Not JSON; fall through.
      }
    }
    const untyped = raw.content.filter((item) => isObject(item) && !("type" in item));
    if (untyped.length > 0) return untyped;
  }
  return raw;
}

function toolText(raw: Json): string {
  if (typeof raw === "string") return raw;
  if (isObject(raw) && "result" in raw) return toolText(raw.result);
  if (isObject(raw) && Array.isArray(raw.content)) {
    return raw.content.map((item) => (isObject(item) && typeof item.text === "string" ? item.text : "")).join("");
  }
  return "";
}

/** Refero often answers in markdown even when asked for JSON (`## Screen: <uuid>` + `**Field**: value` lines). */
function markdownRecords(text: string): JsonObject[] {
  const found: JsonObject[] = [];
  let current: JsonObject | null = null;
  const fields: Record<string, string> = { "Thumbnail URL": "thumbnail_url", "Preview URL": "preview_url", "Page URL": "page_url" };
  for (const line of text.split("\n").map((entry) => entry.trim())) {
    const screen = line.match(/^## Screen: (.+)$/);
    if (screen?.[1]) {
      current = { uuid: screen[1].trim() };
      found.push(current);
      continue;
    }
    if (line.startsWith("## ")) {
      current = null;
      continue;
    }
    const field = line.match(/^\*\*(.+?)\*\*:\s*(.+)$/);
    if (!current || !field?.[1] || !field[2]) continue;
    const key = fields[field[1]];
    if (key) current[key] = field[2].trim();
    else if (field[1] === "Site") current.site = { name: field[2].trim() };
  }
  return found;
}

/** The screen records in a search result: JSON first, then the markdown form. Fails when neither can be read. */
function records(raw: Json): JsonObject[] {
  const unwrapped = unwrapToolResult(raw);
  if (isObject(unwrapped)) {
    for (const key of ["records", "items", "results", "screens", "data"]) {
      const items = unwrapped[key];
      if (Array.isArray(items)) return items.filter(isObject);
    }
  }
  if (Array.isArray(unwrapped)) return unwrapped.filter(isObject);
  const text = toolText(raw);
  const fromMarkdown = markdownRecords(text);
  if (fromMarkdown.length > 0) return fromMarkdown;
  throw new Error(`Refero's search answer couldn't be read: ${text.trim().slice(0, 200) || JSON.stringify(raw).slice(0, 200)}`);
}

export function stringField(value: JsonObject, keys: string[]) {
  for (const key of keys) {
    const field = value[key];
    if (typeof field === "string" && field.trim()) return field.trim();
    if (typeof field === "number") return String(field);
  }
  return undefined;
}

function nestedString(value: JsonObject, path: [string, string]) {
  const parent = value[path[0]];
  return isObject(parent) ? stringField(parent, [path[1]]) : undefined;
}

function toScreen(value: JsonObject): ReferoScreen | null {
  const id = stringField(value, ["uuid", "id", "screenId", "screen_id"]);
  if (!id) return null;
  const productName = nestedString(value, ["site", "name"]) ?? stringField(value, ["productName", "appName", "companyName", "product"]);
  return {
    id,
    title: stringField(value, ["title", "name", "screenName"]) ?? productName ?? "Refero screen",
    productName,
    sourceUrl: stringField(value, ["refero_url", "referoUrl", "sourceUrl", "pageUrl", "page_url"]),
    thumbnailUrl: stringField(value, ["thumbnail_url", "thumbnailUrl", "thumbnail", "preview_url", "previewUrl"]),
    imageUrl: stringField(value, ["preview_url", "previewUrl", "imageUrl", "screenshotUrl", "fullImageUrl"]),
  };
}

export async function searchReferoScreens(query: string, platform: ReferoPlatform): Promise<ReferoScreen[]> {
  const raw = await callReferenceTool("refero", "refero_search_screens", { query, platform, response_format: "json" });
  return records(raw).map(toScreen).filter((screen): screen is ReferoScreen => screen !== null).slice(0, MAX_SEARCH_RESULTS);
}

function decodeBase64(text: string): Uint8Array<ArrayBuffer> | null {
  const payload = text.startsWith("data:") ? (text.split(",", 2)[1] ?? "") : text;
  try {
    const binary = atob(payload.replace(/\s/g, ""));
    return binary.length > 0 ? Uint8Array.from(binary, (char) => char.charCodeAt(0)) : null;
  } catch {
    return null;
  }
}

/** Finds the image bytes in an MCP image result (image content, data URI or base64 field). */
function decodeImage(raw: Json): Uint8Array<ArrayBuffer> | null {
  if (typeof raw === "string") return decodeBase64(raw);
  if (Array.isArray(raw)) {
    for (const item of raw) {
      const decoded = decodeImage(item);
      if (decoded) return decoded;
    }
    return null;
  }
  if (!isObject(raw)) return null;
  for (const key of ["structuredContent", "result", "content", "data", "image", "bytes", "base64"]) {
    if (key in raw) {
      const decoded = decodeImage(raw[key]);
      if (decoded) return decoded;
    }
  }
  return typeof raw.uri === "string" && raw.uri.startsWith("data:") ? decodeBase64(raw.uri) : null;
}

export function looksLikeImage(bytes: Uint8Array) {
  const startsWith = (...prefix: number[]) => prefix.every((byte, index) => bytes[index] === byte);
  const ascii = (start: number, text: string) => [...text].every((char, index) => bytes[start + index] === char.charCodeAt(0));
  return bytes.length >= 12 && (
    startsWith(0x89, 0x50, 0x4e, 0x47) ||
    startsWith(0xff, 0xd8, 0xff) ||
    (ascii(0, "RIFF") && ascii(8, "WEBP")) ||
    ascii(0, "GIF87a") ||
    ascii(0, "GIF89a")
  );
}

export function imageMimeType(bytes: Uint8Array) {
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return "image/jpeg";
  if (bytes[0] === 0x52 && bytes[8] === 0x57) return "image/webp";
  if (bytes[0] === 0x47) return "image/gif";
  return "image/png";
}

/** The full screenshot, or the thumbnail when the full one isn't available. */
export async function fetchReferoScreenImage(screenId: string): Promise<Uint8Array<ArrayBuffer>> {
  for (const imageSize of ["full", "thumbnail"]) {
    try {
      const bytes = decodeImage(await callReferenceTool("refero", "refero_get_screen_image", { screen_id: screenId, image_size: imageSize }));
      if (bytes && looksLikeImage(bytes)) return bytes;
    } catch {
      // Try the next size.
    }
  }
  throw new Error(`Refero has no image for screen ${screenId}.`);
}
