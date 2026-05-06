function getEnv(name: string) {
  return (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.[
    name
  ];
}

function requireSecret() {
  const secret = getEnv("APP_CREDENTIALS_SECRET") ?? getEnv("ANTHROPIC_CREDENTIALS_SECRET");
  if (!secret) {
    throw new Error("Missing APP_CREDENTIALS_SECRET.");
  }
  return secret;
}

function toBase64(value: ArrayBuffer | Uint8Array) {
  const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function fromBase64(value: string) {
  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function getEncryptionKey(secret: string) {
  const encoded = new TextEncoder().encode(secret);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function encryptSecret(rawValue: string) {
  const key = await getEncryptionKey(requireSecret());
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(rawValue);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);

  return {
    encryptedValue: toBase64(ciphertext),
    encryptionIv: toBase64(iv),
  };
}

export async function decryptSecret(encryptedValue: string, encryptionIv: string) {
  const key = await getEncryptionKey(requireSecret());
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64(encryptionIv) },
    key,
    fromBase64(encryptedValue),
  );

  return new TextDecoder().decode(plaintext);
}
