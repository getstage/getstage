import type { ProviderStatusRecord } from "@stage/data-ops/contracts";

export const PROVIDER_CLI_RESTART_BANNER =
  "Installed or logged in from Terminal? Click Refresh so Stage checks Claude and Codex again.";

export const PROVIDER_CLI_MISSING_ROW_NOTE =
  "Installed in Terminal? Click Refresh.";

export function hasMissingProviderCli(
  providers: ProviderStatusRecord[] | undefined,
): boolean {
  return (
    providers?.some((provider) => provider.kind === "cli" && !provider.installed) ?? false
  );
}
