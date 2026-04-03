const DEFAULT_BASE_URL = "https://reliable-bullfrog-917.convex.site/api/v1";

export function requireStageConfig() {
  const apiKey = process.env.STAGE_API_KEY;
  if (!apiKey) {
    throw new Error("STAGE_API_KEY is required.");
  }

  const baseUrl = (process.env.STAGE_API_BASE_URL || DEFAULT_BASE_URL).replace(
    /\/$/,
    "",
  );

  return {
    apiKey,
    baseUrl,
  };
}

export async function stageRequest(method, path, options = {}) {
  const { apiKey, baseUrl } = requireStageConfig();
  const url = `${baseUrl}/${path.replace(/^\//, "")}`;
  const headers = new Headers(options.headers || {});
  headers.set("Authorization", `Bearer ${apiKey}`);

  let body = options.body;
  if (body && !(body instanceof Uint8Array) && !(body instanceof ArrayBuffer) && !(body instanceof Blob)) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(body);
  }

  const response = await fetch(url, {
    method,
    headers,
    body,
  });

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (
    typeof payload === "string" &&
    payload.toLowerCase().includes("<!doctype html")
  ) {
    throw new Error(
      `${method} ${url} returned HTML instead of JSON. The API route is likely being swallowed by the SPA/static asset layer. Check Cloudflare 'run_worker_first' for /api/* and redeploy.`,
    );
  }

  if (!response.ok) {
    throw new Error(
      `${method} ${url} failed with ${response.status}: ${typeof payload === "string" ? payload : JSON.stringify(payload)}`,
    );
  }

  return payload;
}

export function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

export function logStep(message) {
  console.log(`\n[smoke] ${message}`);
}

export function createProjectPayload(prefix) {
  const now = Date.now();
  return {
    name: `${prefix} ${new Date(now).toISOString().replace(/[:.]/g, "-")}`,
    clientName: "Smoke Client",
    type: "branding",
    startDate: now,
    endDate: now + 14 * 24 * 60 * 60 * 1000,
    phases: [
      {
        name: "Discovery",
        tasks: ["Kickoff", "Research"],
      },
      {
        name: "Design",
        tasks: ["Moodboard", "First concepts"],
      },
    ],
  };
}

export const tinyPngBytes = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO5hVtQAAAAASUVORK5CYII=",
  "base64",
);

export async function uploadBinary(uploadUrl, bytes, mimeType) {
  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": mimeType,
      "Content-Length": String(bytes.byteLength),
    },
    body: bytes,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`PUT ${uploadUrl} failed with ${response.status}: ${text}`);
  }
}
