import { getEnv } from "../../helpers/env";

export interface PlatformInfo {
  isMac: boolean;
  deviceType: string;
  os: string | null;
}

const MAC_DEFAULT: PlatformInfo = { isMac: true, deviceType: "desktop", os: null };

// Resolve a DataFast visitor id to { isMac, deviceType, os }.
//
// GET https://datafa.st/api/v1/visitors/{id} with Bearer DATAFAST_API_KEY. The
// exact JSON field path for os/device is not documented in the public API ref,
// so we probe the likely shapes (flat `os`/`device`, nested `identity.os.name`/
// `identity.device.type`, and `system`/{...}) and fall back to Mac on any miss.
// Unknown / no visitor id / API failure → Mac default. Never throws — a send
// must never crash because we couldn't detect the OS.
export async function detectPlatform(visitorId?: string): Promise<PlatformInfo> {
  if (!visitorId) return MAC_DEFAULT;

  const apiKey = getEnv("DATAFAST_API_KEY");
  if (!apiKey) return MAC_DEFAULT;

  try {
    const response = await fetch(`https://datafa.st/api/v1/visitors/${encodeURIComponent(visitorId)}`, {
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    });
    if (!response.ok) return MAC_DEFAULT;

    const data = (await response.json()) as Record<string, unknown>;
    const os = pickString(data, ["os", ["identity", "os", "name"], ["system", "os"]]);
    const device = pickString(data, ["device", ["identity", "device", "type"], ["system", "device"]]);

    const isMac = os ? os.toLowerCase().includes("mac") : true;
    return {
      isMac,
      deviceType: device ?? "desktop",
      os: os ?? null,
    };
  } catch {
    return MAC_DEFAULT;
  }
}

// Try a flat key first, then nested paths. Returns the first non-empty string.
function pickString(data: Record<string, unknown>, paths: (string | string[])[]): string | undefined {
  for (const path of paths) {
    const value = typeof path === "string" ? data[path] : getPath(data, path);
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return undefined;
}

function getPath(data: Record<string, unknown>, path: string[]): unknown {
  let current: unknown = data;
  for (const key of path) {
    if (current && typeof current === "object") {
      current = (current as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }
  return current;
}
