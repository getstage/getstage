import { requireEnv, requireSiteUrl } from "../env";
import { FIGMA_OAUTH_SCOPES, type NativeProvider } from "../../models/integrations/contentPlatforms";

function toBase64Url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function sha256(value: string) {
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return new Uint8Array(digest);
}

export async function generatePkcePair() {
  const randomBytes = crypto.getRandomValues(new Uint8Array(32));
  const verifier = toBase64Url(randomBytes);
  const challenge = toBase64Url(await sha256(verifier));
  return {
    verifier,
    challenge,
  };
}

export function encodeBasicAuth(username: string, password: string) {
  return btoa(`${username}:${password}`);
}

export async function exchangeNotionCodeForToken(code: string) {
  const response = await fetch("https://api.notion.com/v1/oauth/token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Basic ${encodeBasicAuth(
        requireEnv("NOTION_CLIENT_ID"),
        requireEnv("NOTION_CLIENT_SECRET"),
      )}`,
      "Notion-Version": "2026-03-11",
    },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code,
      redirect_uri: getCallbackUrl("notion"),
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Notion token exchange failed: ${response.status} ${errorBody}`);
  }

  return (await response.json()) as {
    access_token: string;
    refresh_token?: string | null;
    workspace_id?: string;
    workspace_name?: string | null;
    workspace_icon?: string | null;
    owner?:
      | {
          type?: "user";
          user?: {
            name?: string | null;
            person?: {
              email?: string | null;
            };
          };
        }
      | {
          type?: "workspace";
          workspace?: {
            name?: string | null;
          };
        };
    bot_id?: string;
  };
}

export async function exchangeFigmaCodeForToken(code: string, codeVerifier?: string) {
  const body = new URLSearchParams();
  body.set("redirect_uri", getCallbackUrl("figma"));
  body.set("code", code);
  body.set("grant_type", "authorization_code");
  if (codeVerifier) {
    body.set("code_verifier", codeVerifier);
  }

  const response = await fetch("https://api.figma.com/v1/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${encodeBasicAuth(
        requireEnv("FIGMA_CLIENT_ID"),
        requireEnv("FIGMA_CLIENT_SECRET"),
      )}`,
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Figma token exchange failed: ${response.status} ${errorBody}`);
  }

  return (await response.json()) as {
    access_token: string;
    refresh_token?: string | null;
    expires_in?: number;
    user_id_string?: string;
  };
}

export async function fetchFigmaMe(accessToken: string) {
  const response = await fetch("https://api.figma.com/v1/me", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Figma profile fetch failed: ${response.status} ${errorBody}`);
  }

  return (await response.json()) as {
    handle?: string;
    email?: string;
    img_url?: string;
    id?: string;
  };
}

export function getProviderLabel(provider: NativeProvider) {
  return provider === "notion" ? "Notion" : "Figma";
}

export function generateOAuthState() {
  return crypto.randomUUID().replace(/-/g, "");
}

export function buildSettingsRedirect(
  provider: NativeProvider,
  status: "connected" | "error",
  reason?: string,
) {
  const url = new URL("/settings", requireSiteUrl());
  url.searchParams.set("tab", "integrations");
  url.searchParams.set("integration", provider);
  url.searchParams.set("integration_status", status);
  if (reason) {
    url.searchParams.set("reason", reason);
  }
  return url.toString();
}

export function isAllowedDesktopOAuthReturnUrl(returnUrl: string, provider: NativeProvider) {
  let parsed: URL;

  try {
    parsed = new URL(returnUrl);
  } catch {
    return false;
  }

  const expectedPath = `/integrations/${provider}`;

  if (parsed.protocol === "stage:" && parsed.hostname === "integrations") {
    return parsed.pathname === `/${provider}`;
  }

  if (
    parsed.protocol === "http:" &&
    parsed.hostname === "127.0.0.1" &&
    parsed.port === "48224"
  ) {
    return parsed.pathname === expectedPath;
  }

  return false;
}

export function buildOAuthCompleteRedirect(
  provider: NativeProvider,
  status: "connected" | "error",
  reason?: string,
  returnUrl?: string | null,
) {
  if (returnUrl && isAllowedDesktopOAuthReturnUrl(returnUrl, provider)) {
    const url = new URL(returnUrl);
    url.searchParams.set("integration", provider);
    url.searchParams.set("integration_status", status);
    if (reason) {
      url.searchParams.set("reason", reason);
    }
    return url.toString();
  }

  return buildSettingsRedirect(provider, status, reason);
}

export function getCallbackUrl(provider: NativeProvider) {
  return `${requireSiteUrl()}/integrations/${provider}/callback`;
}

export const FIGMA_OAUTH_SCOPE_STRING = FIGMA_OAUTH_SCOPES.join(" ");
