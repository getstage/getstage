import type { ActionCtx } from "../../_generated/server";
import { DESIGN_LIBRARY_MCP } from "../../helpers/integrations/designLibraryOAuth";
import { callLibraryTool, isObject, stringField, unwrapToolResult, type Json, type JsonObject } from "./mcpTools";
import type { LibraryScreen } from "./mobbin";

// Refero search with the user's own Refero account (or, until the shared access ends, Stage's key).
// Port of the engine's Refero client (`apps/stage-engine/src/refero/{service,parse}.rs`).

type ReferoScreen = LibraryScreen;

const MAX_SEARCH_RESULTS = 12;

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

export async function searchReferoScreens(ctx: Pick<ActionCtx, "runAction">, token: string, query: string, platform: "web" | "ios"): Promise<LibraryScreen[]> {
  const { label, url } = DESIGN_LIBRARY_MCP.refero;
  const raw = await callLibraryTool(ctx, { label, url, token }, "refero_search_screens", { query, platform, response_format: "json" });
  return records(raw).map(toScreen).filter((screen): screen is ReferoScreen => screen !== null).slice(0, MAX_SEARCH_RESULTS);
}
