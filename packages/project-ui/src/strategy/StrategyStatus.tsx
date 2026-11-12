import type { SectionStatus } from "./types";

export function StatusPill({ status }: { status: SectionStatus }) {
  return status === "approved" ? (
    <span className="rounded-[4px] bg-[#DCFCE7] px-[6px] py-1 text-[12px] font-normal leading-[1.25] text-[#052E16]">Approved</span>
  ) : (
    <span className="rounded-[4px] bg-[#FEE2E2] px-[6px] py-1 text-[12px] font-normal leading-[1.25] text-[#450A0A]">Action Required</span>
  );
}

export function MetaDot() {
  return <span className="h-1 w-1 rounded-full bg-[#D9D9D9]" />;
}

// "2 of 7 sections approved · Total 7 sections · Based on Research"
export function StrategyProgress({ approvedCount, total }: { approvedCount: number; total: number }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-[10px] w-[65px] overflow-hidden rounded-full bg-[#E5E5E5]">
        <div className="h-full rounded-full bg-[#16A34A] transition-[width]" style={{ width: `${Math.max(8, (approvedCount / total) * 100)}%` }} />
      </div>
      <p className="text-[13px] font-medium leading-[1.25] text-[#171717]">{approvedCount} of {total} sections approved</p>
      <MetaDot />
      <p className="text-[13px] font-medium leading-[1.25] text-[#737373]">Total {total} sections</p>
      <MetaDot />
      <p className="text-[13px] font-medium leading-[1.25] text-[#737373]">Based on Research</p>
    </div>
  );
}
