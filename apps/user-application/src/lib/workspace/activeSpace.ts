const STORAGE_KEY = "stage:active-space-owner-id";
const listeners = new Set<() => void>();

export function getActiveSpaceOwnerId() {
  if (typeof sessionStorage === "undefined") return null;
  return sessionStorage.getItem(STORAGE_KEY);
}

export function setActiveSpaceOwnerId(ownerUserId: string) {
  sessionStorage.setItem(STORAGE_KEY, ownerUserId);
  for (const listener of listeners) listener();
}

export function clearActiveSpaceOwnerId() {
  sessionStorage.removeItem(STORAGE_KEY);
  for (const listener of listeners) listener();
}

export function subscribeActiveSpace(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
