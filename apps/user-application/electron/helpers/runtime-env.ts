/** Read env at runtime. Bracket access avoids Vite `define` inlining empty strings in main bundle. */
export function runtimeEnv(name: string): string | undefined {
  const value = process.env[name];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
