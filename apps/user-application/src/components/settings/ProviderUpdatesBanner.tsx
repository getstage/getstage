import { useProviderUpdates } from "@/hooks/engine/useProviderStatus";

export function ProviderUpdatesBanner() {
  const { providersWithUpdates, isUpdating, updateAll } = useProviderUpdates();

  if (providersWithUpdates.length === 0) {
    return null;
  }

  const count = providersWithUpdates.length;
  const label =
    count === 1
      ? `${providersWithUpdates[0]!.label} has a new version available.`
      : `${count} providers have new versions available.`;

  return (
    <div className="flex items-center justify-between gap-3 rounded-surface border border-accent-light bg-accent-light px-4 py-[10px]">
      <p className="text-[13px] font-medium text-ink-soft">{label}</p>
      <button
        type="button"
        disabled={isUpdating}
        onClick={() =>
          void updateAll().catch((error: unknown) => {
            window.alert(error instanceof Error ? error.message : "Provider update failed.");
          })
        }
        className="shrink-0 rounded-control bg-accent px-3 py-[6px] text-[12px] font-medium leading-none text-white shadow-stage-hairline transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isUpdating ? "Updating…" : count === 1 ? "Update" : "Update all"}
      </button>
    </div>
  );
}
