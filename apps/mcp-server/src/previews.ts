// Screens found by search_references come back as pictures too, so the chat shows them
// and the AI can judge what they look like, not only their titles.

export type ToolContent = { type: "text"; text: string } | { type: "image"; data: string; mimeType: string };
export type FoundScreens = { screens: { title: string; thumbnailUrl?: string }[] };

export const PREVIEW_LIMIT = 8;
const PREVIEW_MAX_BYTES = 2_000_000;
const PREVIEW_TIMEOUT_MS = 4_000;
const PREVIEW_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

/** The body, or null once it passes the limit (the download stops there). */
async function readLimited(body: ReadableStream<Uint8Array>): Promise<Uint8Array | null> {
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > PREVIEW_MAX_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

function base64(bytes: Uint8Array) {
  let binary = "";
  for (let start = 0; start < bytes.length; start += 0x8000) binary += String.fromCharCode(...bytes.subarray(start, start + 0x8000));
  return btoa(binary);
}

/** A thumbnail as an image, or null when it's missing, slow, too large or not a picture the chat can show. */
export async function preview(url: string | undefined): Promise<ToolContent | null> {
  if (!url) return null;
  try {
    // The deadline covers the request and reading the body.
    const response = await fetch(url, { signal: AbortSignal.timeout(PREVIEW_TIMEOUT_MS) });
    const mimeType = response.headers.get("Content-Type")?.split(";")[0]?.trim() ?? "";
    if (!response.ok || !response.body || !PREVIEW_TYPES.has(mimeType)) return null;
    const bytes = await readLimited(response.body);
    return bytes ? { type: "image", data: base64(bytes), mimeType } : null;
  } catch {
    return null;
  }
}

/** Pictures of the first screens, each labelled with its number and title; screens without one are left out. */
export async function screenPictures({ screens }: FoundScreens): Promise<ToolContent[]> {
  const shown = screens.slice(0, PREVIEW_LIMIT);
  const images = await Promise.all(shown.map((screen) => preview(screen.thumbnailUrl)));
  return shown.flatMap((screen, index) => {
    const image = images[index];
    return image ? [{ type: "text" as const, text: `${index + 1}. ${screen.title}` }, image] : [];
  });
}
