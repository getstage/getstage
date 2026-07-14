import { useCallback, useMemo, useState } from "react";
import { useProviderUpdates } from "@/hooks/engine/useProviderStatus";

export function ProviderUpdatesBanner() {
  const { providersWithUpdates, isUpdating, updateAll } = useProviderUpdates();
  const [logLines, setLogLines] = useState<string[]>([]);

  const appendLog = useCallback((line: string) => {
    setLogLines((previous) => [...previous, line]);
  }, []);

  const count = providersWithUpdates.length;
  const label = useMemo(() => {
    if (count === 1) {
      return `${providersWithUpdates[0]!.label} has a new version available.`;
    }
    return `${count} providers have new versions available.`;
  }, [count, providersWithUpdates]);

  if (providersWithUpdates.length === 0 && logLines.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2 rounded-surface border border-accent-light bg-accent-light px-4 py-[10px]">
      {providersWithUpdates.length > 0 ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-[13px] font-medium text-ink-soft">{label}</p>
          <button
            type="button"
            disabled={isUpdating}
            onClick={() => {
              const names = providersWithUpdates.map((provider) => provider.label).join(", ");
              setLogLines([`Starting update for ${names}…`]);
              void updateAll({
                onStart: (providerLabel, commandHint) => {
                  appendLog(
                    commandHint
                      ? `Running \`${commandHint}\` for ${providerLabel}…`
                      : `Updating ${providerLabel}…`,
                  );
                },
                onResult: (providerLabel, result) => {
                  if (result.command) {
                    appendLog(`$ ${result.command}`);
                  }
                  if (result.output) {
                    appendLog(result.output.trim());
                  }
                  if (result.message) {
                    appendLog(result.message);
                  }
                  appendLog(
                    result.status === "updated"
                      ? `${providerLabel} update finished.`
                      : `${providerLabel} update failed.`,
                  );
                },
              }).catch((error: unknown) => {
                const message =
                  error instanceof Error ? error.message : "Provider update failed.";
                appendLog(message);
              });
            }}
            className="shrink-0 rounded-control bg-accent px-3 py-[6px] text-[12px] font-medium leading-none text-white shadow-stage-hairline transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isUpdating ? "Updating…" : count === 1 ? "Update" : "Update all"}
          </button>
        </div>
      ) : null}

      {logLines.length > 0 ? (
        <div className="overflow-hidden rounded-[6px] border border-black/10 bg-[#111111]">
          <div className="flex items-center justify-between border-b border-white/10 px-3 py-1.5">
            <p className="text-[11px] font-medium tracking-wide text-white/70">Update log</p>
            {!isUpdating ? (
              <button
                type="button"
                onClick={() => setLogLines([])}
                className="text-[11px] text-white/50 transition-colors hover:text-white/80"
              >
                Clear
              </button>
            ) : null}
          </div>
          <pre className="max-h-40 overflow-auto px-3 py-2 font-mono text-[11px] leading-[1.45] whitespace-pre-wrap text-[#D6D6D6]">
            {logLines.join("\n\n")}
            {isUpdating ? "\n\n…" : ""}
          </pre>
        </div>
      ) : null}
    </div>
  );
}
