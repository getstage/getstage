// Figma frames as moodboard images for the backend (MCP add_to_moodboard), with the user's connected Figma account.
// Port of the engine's Figma import (`apps/stage-engine/src/figma/service.rs`); keep both in step.

const FIGMA_API = "https://api.figma.com/v1";
const MAX_FIGMA_IMPORTS = 12;
const FRAME_TYPES = new Set(["FRAME", "COMPONENT", "COMPONENT_SET", "INSTANCE", "SECTION"]);

type FigmaNode = { id: string; name?: string; type: string; children?: FigmaNode[] };

export type FigmaImage = { id: string; title: string; sourceUrl: string; renderUrl: string; bytes: Uint8Array<ArrayBuffer> };

type FigmaLink = { fileKey: string; nodeId?: string; url: string };

/** "figma.com/design/<key>/Name?node-id=12-34" → file key and node "12:34". */
export function parseFigmaLink(raw: string): FigmaLink {
  const url = /^https?:\/\//.test(raw.trim()) ? raw.trim() : `https://${raw.trim()}`;
  if (!url.toLowerCase().includes("figma.com/")) throw new Error("Paste a valid Figma link.");
  const fileKey = /\/(?:design|file|board)\/([^/?#]+)/.exec(url)?.[1];
  if (!fileKey) throw new Error("Figma link must include a file key.");
  const nodeId = new URL(url).searchParams.get("node-id")?.replace(/-/g, ":") || undefined;
  return { fileKey, nodeId, url };
}

async function figmaJson<T>(token: string, path: string, operation: string): Promise<T> {
  const response = await fetch(`${FIGMA_API}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) {
    const detail = (await response.text().catch(() => "")).trim() || "No error detail was returned.";
    if (response.status === 403 || response.status === 401) {
      throw new Error(`Figma refused access (${response.status}). Reconnect Figma in Stage, or check the file is shared with that Figma account.`);
    }
    throw new Error(`${operation} failed (${response.status}): ${detail.slice(0, 200)}`);
  }
  return (await response.json()) as T;
}

/** Frames to import: the picked frame as one picture, else the file's top-level frames (same as Stage for Mac). */
async function importNodes(token: string, link: FigmaLink): Promise<FigmaNode[]> {
  if (link.nodeId) {
    const { nodes } = await figmaJson<{ nodes: Record<string, { document: FigmaNode } | null> }>(
      token, `/files/${link.fileKey}/nodes?ids=${encodeURIComponent(link.nodeId)}&depth=1`, "Figma selected node request");
    return [nodes[link.nodeId]?.document ?? { id: link.nodeId, type: "FRAME" }];
  }
  const { document } = await figmaJson<{ document: FigmaNode }>(token, `/files/${link.fileKey}?depth=2`, "Figma file request");
  const found: FigmaNode[] = [];
  const stack = [document];
  while (stack.length > 0 && found.length < MAX_FIGMA_IMPORTS) {
    const node = stack.pop()!;
    if (FRAME_TYPES.has(node.type)) found.push(node);
    stack.push(...[...(node.children ?? [])].reverse());
  }
  return found;
}

function sourceUrlFor(link: FigmaLink, nodeId: string) {
  if (link.nodeId) return link.url;
  return `${link.url}${link.url.includes("?") ? "&" : "?"}node-id=${nodeId.replace(/:/g, "-")}`;
}

/** Renders up to 12 frames of a Figma link as PNGs (2x) and downloads them. */
export async function importFigmaImages(token: string, figmaUrl: string): Promise<FigmaImage[]> {
  const link = parseFigmaLink(figmaUrl);
  const nodes = await importNodes(token, link);
  if (nodes.length === 0) throw new Error("No importable Figma frames were found in that file.");
  const { images } = await figmaJson<{ images: Record<string, string | null> }>(
    token, `/images/${link.fileKey}?ids=${encodeURIComponent(nodes.map((node) => node.id).join(","))}&format=png&scale=2`, "Figma image render request");

  const imported: FigmaImage[] = [];
  for (const node of nodes) {
    const renderUrl = images[node.id];
    if (!renderUrl) continue;
    const response = await fetch(renderUrl);
    if (!response.ok) throw new Error(`Figma image download failed (${response.status}).`);
    imported.push({
      id: node.id,
      title: node.name?.trim() || `Figma frame ${node.id}`,
      sourceUrl: sourceUrlFor(link, node.id),
      renderUrl,
      bytes: new Uint8Array(await response.arrayBuffer()),
    });
  }
  if (imported.length === 0) throw new Error("Figma returned no renderable images for that link.");
  return imported;
}
