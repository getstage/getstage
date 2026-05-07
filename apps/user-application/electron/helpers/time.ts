export function now() {
  return Date.now();
}

export function delay(ms: number) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, ms));
}
