function readTrimmedEnv(name: string): string | null {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : null;
}

export function getOpenRouterApiKey(): string | null {
  return (
    readTrimmedEnv("OPENROUTER_API_KEY") ??
    readTrimmedEnv("openrouter_api_key") ??
    readTrimmedEnv("STAGE_OPENROUTER_API_KEY")
  );
}

export function isOpenRouterConfigured(): boolean {
  return getOpenRouterApiKey() !== null;
}
