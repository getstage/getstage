/**
 * Resolve bundled public assets in Electron (file://) and web (http/https).
 * Absolute "/foo" paths break in packaged desktop because they map to file:///foo.
 */
export function publicAssetUrl(path: string) {
  const normalized = path.startsWith("/") ? path.slice(1) : path;
  return new URL(normalized, window.location.href).toString();
}
