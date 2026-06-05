import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
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

function toStoredSessionFile(session: DesktopStoredSession): StoredSessionFile {
  return {
    encrypted: false,
    payload: serializeSession(session),
    version: DESKTOP_SESSION_STORAGE_VERSION,
  };
}

function fromStoredSessionFile(file: StoredSessionFile) {
  if (file.version !== DESKTOP_SESSION_STORAGE_VERSION) {
    return null;
  }

  if (file.encrypted) {
    // Legacy keychain-backed sessions trigger macOS password prompts — drop them.
    return null;
  }

  return desktopStoredSessionSchema.parse(JSON.parse(file.payload));
}

export async function saveStoredSession(session: DesktopStoredSession) {
  const filePath = authSessionPath();
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(toStoredSessionFile(session)), "utf8");
}

export async function loadStoredSession() {
  const filePath = authSessionPath();

  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as StoredSessionFile;

    if (parsed.encrypted) {
      await rm(filePath, { force: true });
      return null;
    }

    return fromStoredSessionFile(parsed);
  } catch {
    return null;
  }
}

export async function clearStoredSession() {
  await rm(authSessionPath(), { force: true });
}
