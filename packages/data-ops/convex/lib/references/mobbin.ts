import { DESIGN_LIBRARY_MCP } from "../../helpers/integrations/designLibraryOAuth";
import { callLibraryTool, isObject, stringField, unwrapToolResult, type JsonObject } from "./mcpTools";

// Mobbin search with the user's own Mobbin account: app and web screens, and website sections.
// Answer shape checked against Mobbin's MCP on 2026-11-26 (`sections: [{ id, image_url, mobbin_url, site_name }]`).

export type LibraryScreen = {
  id: string;
  title: string;
  productName?: string;
  sourceUrl?: string;
  thumbnailUrl?: string;
  imageUrl?: string;
};

export type MobbinSearch = { kind: "screens"; query: string; platform: "web" | "ios" } | { kind: "sections"; query: string };

const MAX_SEARCH_RESULTS = 12;

function toScreen(item: JsonObject): LibraryScreen | null {
  const id = stringField(item, ["id"]);
  if (!id) return null;
  const productName = stringField(item, ["app_name", "site_name", "appName", "siteName", "name"]);
  const imageUrl = stringField(item, ["image_url", "imageUrl"]);
  return { id, title: productName ?? "Mobbin screen", productName, sourceUrl: stringField(item, ["mobbin_url", "url"]), thumbnailUrl: imageUrl, imageUrl };
}

export async function searchMobbin(token: string, search: MobbinSearch): Promise<LibraryScreen[]> {
  const { label, url } = DESIGN_LIBRARY_MCP.mobbin;
  const args = search.kind === "screens" ? { query: search.query, platform: search.platform } : { query: search.query };
  const raw = unwrapToolResult(await callLibraryTool({ label, url, token }, `search_${search.kind}`, args));
  const items = isObject(raw) ? raw[search.kind] : null;
  if (!Array.isArray(items)) throw new Error(`Mobbin's search answer couldn't be read: ${JSON.stringify(raw).slice(0, 200)}`);
  return items.filter(isObject).map(toScreen).filter((screen): screen is LibraryScreen => screen !== null).slice(0, MAX_SEARCH_RESULTS);
}
