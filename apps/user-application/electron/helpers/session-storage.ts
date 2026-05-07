import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { safeStorage } from "electron";
import {
  desktopStoredSessionSchema,
  type DesktopStoredSession,
} from "@shared/models/desktop";
import {
  DESKTOP_SESSION_STORAGE_VERSION,
  authSessionPath,
  type StoredSessionFile,
} from "./auth";

function serializeSession(session: DesktopStoredSession) {
  return JSON.stringify(desktopStoredSessionSchema.parse(session));
}

function encryptSession(session: DesktopStoredSession): StoredSessionFile {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error("Electron safeStorage encryption is not available.");
  }

  return {
    encrypted: true,
    payload: safeStorage.encryptString(serializeSession(session)).toString("base64"),
    version: DESKTOP_SESSION_STORAGE_VERSION,
  };
}

function decryptSession(file: StoredSessionFile) {
  if (file.version !== DESKTOP_SESSION_STORAGE_VERSION || !file.encrypted) {
    return null;
  }

  const decrypted = safeStorage.decryptString(Buffer.from(file.payload, "base64"));
  return desktopStoredSessionSchema.parse(JSON.parse(decrypted));
}

export async function saveStoredSession(session: DesktopStoredSession) {
  const filePath = authSessionPath();
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(encryptSession(session)), "utf8");
}

export async function loadStoredSession() {
  try {
    const raw = await readFile(authSessionPath(), "utf8");
    const parsed = JSON.parse(raw) as StoredSessionFile;
    return decryptSession(parsed);
  } catch {
    return null;
  }
}

export async function clearStoredSession() {
  await rm(authSessionPath(), { force: true });
}
