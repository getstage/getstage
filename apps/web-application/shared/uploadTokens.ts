import type { UploadPurpose } from "./uploadRules";

export type UploadTokenPayload = {
  tokenId: string;
  userId: string;
  purpose: UploadPurpose;
  r2ObjectKey: string;
  expiresAt: number;
};

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function getProcessEnv(name: string) {
  return (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.[
    name
  ];
}

export function getRequiredEnv(name: string) {
  const value = getProcessEnv(name);
  if (!value) {
    throw new Error(`${name} is not configured.`);
  }
  return value;
}

function toBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function sign(value: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return toBase64Url(new Uint8Array(signature));
}

async function verify(value: string, secret: string, signature: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );

  return crypto.subtle.verify("HMAC", key, fromBase64Url(signature), encoder.encode(value));
}

export async function createSignedUploadToken(payload: UploadTokenPayload, secret: string) {
  const encodedPayload = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const signature = await sign(encodedPayload, secret);
  return `${encodedPayload}.${signature}`;
}

export async function verifySignedUploadToken(token: string, secret: string) {
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) {
    throw new Error("Invalid upload token.");
  }

  const isValid = await verify(encodedPayload, secret, signature);
  if (!isValid) {
    throw new Error("Invalid upload token.");
  }

  const payload = JSON.parse(decoder.decode(fromBase64Url(encodedPayload))) as UploadTokenPayload;

  if (
    typeof payload.tokenId !== "string" ||
    typeof payload.userId !== "string" ||
    typeof payload.purpose !== "string" ||
    typeof payload.r2ObjectKey !== "string" ||
    typeof payload.expiresAt !== "number"
  ) {
    throw new Error("Invalid upload token.");
  }

  if (payload.expiresAt <= Date.now()) {
    throw new Error("Upload token expired.");
  }

  return payload;
}

export function buildMediaUrl(r2ObjectKey: string) {
  return `/media/${r2ObjectKey
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")}`;
}

export function parseMediaPath(pathname: string) {
  const trimmed = pathname.replace(/^\/media\//, "");
  return trimmed
    .split("/")
    .filter(Boolean)
    .map((segment) => decodeURIComponent(segment))
    .join("/");
}

export function extractR2ObjectKeyFromUrl(url: string | null | undefined) {
  if (!url) {
    return null;
  }

  if (url.startsWith("/media/")) {
    return parseMediaPath(url);
  }

  try {
    const parsed = new URL(url);
    if (parsed.pathname.startsWith("/media/")) {
      return parseMediaPath(parsed.pathname);
    }
  } catch {
    return null;
  }

  return null;
}

export function sanitizeFileExtension(fileName: string, fallback: string) {
  const match = fileName.toLowerCase().match(/\.([a-z0-9]+)$/);
  return match ? match[1] : fallback;
}
