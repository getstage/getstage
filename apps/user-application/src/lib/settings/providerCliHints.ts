import type { ProviderStatusRecord } from "@stage/data-ops/contracts";

export const PROVIDER_CLI_RESTART_BANNER =
  "Installed Claude or Codex in Terminal but Stage still shows missing? Quit Stage completely (Cmd+Q), reopen it, then click Refresh. Stage picks up Homebrew and npm CLI tools on a fresh launch.";

export const PROVIDER_CLI_MISSING_ROW_NOTE =
  "Installed in Terminal? Quit Stage (Cmd+Q), reopen, then Refresh.";

export function hasMissingProviderCli(
  providers: ProviderStatusRecord[] | undefined,
): boolean {
  return (
    providers?.some((provider) => provider.kind === "cli" && !provider.installed) ?? false
  );
}
