import { imageMimeType, looksLikeImage } from "./refero";

// Downloads an image link for the moodboard with the engine's checks
// (`apps/stage-engine/src/moodboard/workflow.rs`: http(s) only, no local/private hosts, real image bytes, 10 MB max).

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

// `host` is URL.hostname: IPv6 addresses come in brackets, IPv4 addresses already normalised to a.b.c.d.
function isBlockedHost(host: string) {
  const lower = host.toLowerCase();
  if (lower === "localhost" || lower.endsWith(".localhost")) return true;
  if (lower.startsWith("[")) {
    const ipv6 = lower.slice(1, -1);
    // Loopback, unspecified, private (fc00::/7), link-local (fe80::/10) and IPv4-mapped addresses.
    return ipv6 === "::1" || ipv6 === "::" || /^f[cd]/.test(ipv6) || /^fe[89ab]/.test(ipv6) || ipv6.startsWith("::ffff:");
  }
  const ipv4 = /^(\d+)\.(\d+)\.\d+\.\d+$/.exec(lower);
  if (!ipv4) return false;
  const [a, b] = [Number(ipv4[1]), Number(ipv4[2])];
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a >= 224;
}

/** Reads the body, stopping as soon as it passes the limit, so a server without Content-Length can't fill memory. */
async function readLimited(response: Response, limit: number) {
  const tooLarge = new Error("That image is too large. Max size is 10 MB.");
  if (Number(response.headers.get("Content-Length") ?? 0) > limit) {
    await response.body?.cancel();
    throw tooLarge;
  }
  if (!response.body) return new Uint8Array(0);
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (let part = await reader.read(); !part.done; part = await reader.read()) {
    size += part.value.length;
    if (size > limit) {
      await reader.cancel();
      throw tooLarge;
    }
    chunks.push(part.value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes;
}

/** Follows redirects itself, so every hop passes the same public-host check as the pasted link. */
async function fetchPublic(url: URL, redirectsLeft = 3): Promise<Response> {
  const response = await fetch(url, { redirect: "manual" });
  const location = response.headers.get("Location");
  if (response.status < 300 || response.status >= 400 || !location) return response;
  await response.body?.cancel();
  if (redirectsLeft === 0) throw new Error("That image URL redirects too many times.");
  return fetchPublic(parsePublicImageUrl(new URL(location, url).toString()), redirectsLeft - 1);
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
  const response = await fetchPublic(url);
  if (!response.ok) throw new Error(`That image URL returned an error (${response.status}).`);
  const bytes = await readLimited(response, MAX_IMAGE_BYTES);
  if (!looksLikeImage(bytes)) throw new Error("Paste a direct PNG, JPG, WebP, or GIF image URL.");
  const title = url.pathname.split("/").filter((segment) => segment.trim()).pop() ?? url.hostname;
  return { url: url.toString(), title, bytes, mimeType: imageMimeType(bytes) };
}
