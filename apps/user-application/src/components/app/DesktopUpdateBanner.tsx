import { useDesktopUpdate } from "@/hooks/useDesktopUpdate";

export function DesktopUpdateBanner() {
  const { status, isDesktop, installUpdate } = useDesktopUpdate();

  if (!isDesktop || !status?.availableVersion) {
    return null;
  }

  const ready = Boolean(status.downloaded);

  return (
    <div className="flex shrink-0 items-center justify-between gap-[12px] border-b border-[#E5E7FF] bg-[#F5F3FF] px-[16px] py-[10px]">
      <p className="text-[13px] font-medium text-[#4338CA]">
        {ready
          ? `Stage ${status.availableVersion} is ready to install.`
          : `Stage ${status.availableVersion} is available. You are on ${status.currentVersion}.`}
      </p>
      <button
        type="button"
        onClick={() => void installUpdate()}
        disabled={status.isChecking}
        className="shrink-0 rounded-[6px] border border-[rgba(158,153,248,0.75)] bg-gradient-to-b from-[#7B76DF] to-[#463FBA] px-[12px] py-[6px] text-[12px] font-medium leading-none text-[#FAFAFA] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status.isChecking ? "Checking…" : ready ? "Restart to update" : "Update now"}
      </button>
    </div>
  );
}
