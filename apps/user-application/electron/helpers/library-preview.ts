import { lookup } from "node:dns/promises";
import { request as httpsRequest } from "node:https";
import type { IncomingMessage } from "node:http";
import { isPrivateIp, parsePublicHttpsUrl } from "@shared/models/safeHttpsUrl";
import {
  fallbackPreviewFromUrl,
  parseHomepagePreview,
  type HomepagePreview,
} from "@shared/models/sitePreview";

const MAX_HTML_BYTES = 256 * 1024;
const TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 3;

function lookupPublic(
  hostname: string,
  _options: unknown,
  callback: (error: Error | null, address: string, family: number) => void,
) {
  void lookup(hostname, { all: true }).then(
    (addresses) => {
      const allowed = addresses.filter(({ address }) => !isPrivateIp(address));
      const chosen = allowed[0];
      if (!chosen) {
        callback(new Error("Private addresses are not allowed."), "", 4);
        return;
      }
      callback(null, chosen.address, chosen.family);
    },
    (error: Error) => callback(error, "", 4),
  );
}

async function assertPublicHttpsUrl(value: string) {
  const url = new URL(parsePublicHttpsUrl(value));
  const addresses = await lookup(url.hostname, { all: true });
  if (
    addresses.length === 0 ||
    addresses.some(({ address }) => isPrivateIp(address))
  ) {
    throw new Error("Private addresses are not allowed.");
  }
  return url;
}

function collectHtml(response: IncomingMessage) {
  return new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = [];
    let total = 0;
    response.on("data", (chunk: Buffer) => {
      total += chunk.length;
      if (total > MAX_HTML_BYTES) {
        response.destroy();
        reject(new Error("Page is too large."));
        return;
      }
      chunks.push(chunk);
    });
    response.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    response.on("error", reject);
  });
}

function requestPublicHttps(url: URL) {
  return new Promise<{
    status: number;
    location: string | null;
    contentType: string;
    body: string;
  }>((resolve, reject) => {
    const request = httpsRequest(
      url,
      {
        method: "GET",
        lookup: lookupPublic,
        headers: {
          Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
          "Accept-Encoding": "identity",
          "Accept-Language": "en-US,en;q=0.9",
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        },
      },
      (response) => {
        const status = response.statusCode ?? 0;
        const location = response.headers.location ?? null;
        const contentType = String(response.headers["content-type"] ?? "");
        if (status >= 300 && status < 400) {
          response.resume();
          resolve({ status, location, contentType, body: "" });
          return;
        }
        void collectHtml(response).then(
          (body) => resolve({ status, location, contentType, body }),
          reject,
        );
      },
    );
    request.setTimeout(TIMEOUT_MS, () => {
      request.destroy();
      reject(new Error("Homepage request timed out."));
    });
    request.on("error", reject);
    request.end();
  });
}

async function fetchHomepageHtml(pageUrl: string) {
  let url = await assertPublicHttpsUrl(pageUrl);
  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
    const response = await requestPublicHttps(url);
    if (response.status >= 300 && response.status < 400) {
      if (!response.location || redirects === MAX_REDIRECTS) {
        throw new Error("Homepage redirected too many times.");
      }
      url = await assertPublicHttpsUrl(new URL(response.location, url).toString());
      continue;
    }
    if (response.status < 200 || response.status >= 300) {
      throw new Error(`Homepage request failed with HTTP ${response.status}.`);
    }
    return { url, contentType: response.contentType, body: response.body };
  }
  throw new Error("Homepage request failed.");
}

/** Fetch a public library homepage and scrape title, subtitle, and icon URL. */
export async function previewLibraryHomepage(rawUrl: unknown): Promise<HomepagePreview> {
  const pageUrl = parsePublicHttpsUrl(rawUrl);
  const fallback = fallbackPreviewFromUrl(pageUrl);
  try {
    const fetched = await fetchHomepageHtml(pageUrl);
    const type = fetched.contentType.toLowerCase();
    if (type && !type.includes("html") && !type.includes("xml") && !type.includes("text/plain")) {
      return fallback;
    }
    return parseHomepagePreview(fetched.body, fetched.url.toString());
  } catch {
    return fallback;
  }
}
