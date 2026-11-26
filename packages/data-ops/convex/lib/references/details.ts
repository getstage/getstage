import { DESIGN_LIBRARY_MCP } from "../../helpers/integrations/designLibraryOAuth";
import { callLibraryTool, isObject, stringField, unwrapToolResult, type Json, type JsonObject } from "./mcpTools";
import type { LibraryScreen } from "./mobbin";

// Details website-section search with the user's own Details account (website Research, moodboard).
// Port of the engine's Details client (`apps/stage-engine/src/details/{service,parse}.rs`).

export type DetailsInspiration = LibraryScreen;

const MAX_SEARCH_RESULTS = 12;

function hits(raw: Json): JsonObject[] {
  const unwrapped = unwrapToolResult(raw);
  if (Array.isArray(unwrapped)) return unwrapped.filter(isObject);
  if (isObject(unwrapped)) {
    for (const key of ["inspirations", "items", "results", "records", "data", "hits"]) {
      const items = unwrapped[key];
      if (Array.isArray(items)) return items.filter(isObject);
    }
  }
  throw new Error(`Details' search answer couldn't be read: ${JSON.stringify(raw).slice(0, 200)}`);
}

function toInspiration(item: JsonObject): DetailsInspiration | null {
  const id = stringField(item, ["id", "inspirationId", "inspiration_id", "slug"]);
  if (!id) return null;
  const productName = stringField(item, ["siteName", "site_name", "productName", "brand", "site"]);
  return {
    id,
    title: stringField(item, ["title", "name", "label"]) ?? productName ?? "Details reference",
    productName,
    sourceUrl: stringField(item, ["url", "sourceUrl", "pageUrl", "siteUrl"]),
    thumbnailUrl: stringField(item, ["previewUrl", "preview_url", "thumbnailUrl", "imageUrl", "posterUrl", "coverUrl"]),
    imageUrl: stringField(item, ["previewUrl", "preview_url", "imageUrl", "posterUrl", "thumbnailUrl", "coverUrl"]),
  };
}

/** Real website sections (hero, pricing, footer…) for a query, like the Mac's Research on website projects. */
export async function searchDetailsInspirations(token: string, query: string): Promise<DetailsInspiration[]> {
  const { label, url } = DESIGN_LIBRARY_MCP.details;
  const raw = await callLibraryTool({ label, url, token }, "search_inspirations", { query });
  return hits(raw).map(toInspiration).filter((hit): hit is DetailsInspiration => hit !== null).slice(0, MAX_SEARCH_RESULTS);
}
