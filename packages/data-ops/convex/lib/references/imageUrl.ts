import { imageMimeType, looksLikeImage } from "./refero";

// Downloads an image link for the moodboard with the engine's checks
// (`apps/stage-engine/src/moodboard/workflow.rs`: http(s) only, no local/private hosts, real image bytes, 10 MB max).

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

function isBlockedHost(host: string) {
  const lower = host.toLowerCase().replace(/^\[|\]$/g, "");
  if (lower === "localhost" || lower === "0.0.0.0" || lower.endsWith(".localhost")) return true;
  const ipv4 = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(lower);
  if (ipv4) {
    const [a, b] = [Number(ipv4[1]), Number(ipv4[2])];
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a >= 224;
  }
  return lower === "::1" || lower === "::" || lower.startsWith("fc") || lower.startsWith("fd") || lower.startsWith("fe80");
}

export function parsePublicImageUrl(raw: string): URL {
  const trimmed = raw.trim();
  if (!trimmed) throw new Error("Paste an image URL.");
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
  } catch {
    throw new Error("Paste a valid image URL.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("Image URLs must start with http or https.");
  if (isBlockedHost(url.hostname)) throw new Error("That image URL is not allowed.");
  return url;
}

export async function downloadImage(raw: string) {
  const url = parsePublicImageUrl(raw);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`That image URL returned an error (${response.status}).`);
  if (Number(response.headers.get("Content-Length") ?? 0) > MAX_IMAGE_BYTES) throw new Error("That image is too large. Max size is 10 MB.");
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.length > MAX_IMAGE_BYTES) throw new Error("That image is too large. Max size is 10 MB.");
  if (!looksLikeImage(bytes)) throw new Error("Paste a direct PNG, JPG, WebP, or GIF image URL.");
  const title = url.pathname.split("/").filter((segment) => segment.trim()).pop() ?? url.hostname;
  return { url: url.toString(), title, bytes, mimeType: imageMimeType(bytes) };
}
