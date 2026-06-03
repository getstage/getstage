export type UpstreamStaleKind = "research" | "strategy";

const STORAGE_PREFIX = "stage:upstream-stale:";

const VALID_KINDS: UpstreamStaleKind[] = ["research", "strategy"];

function storageKey(projectId: string) {
  return `${STORAGE_PREFIX}${projectId}`;
}

export function markUpstreamStale(projectId: string, kind: UpstreamStaleKind) {
  try {
    sessionStorage.setItem(storageKey(projectId), kind);
  } catch {
    // Ignore quota / private mode.
  }
}

export function readUpstreamStale(projectId: string): UpstreamStaleKind | null {
  try {
    const raw = sessionStorage.getItem(storageKey(projectId));
    return VALID_KINDS.includes(raw as UpstreamStaleKind) ? (raw as UpstreamStaleKind) : null;
  } catch {
    return null;
  }
}

export function clearUpstreamStale(projectId: string) {
  try {
    sessionStorage.removeItem(storageKey(projectId));
  } catch {
    // Ignore.
  }
}
