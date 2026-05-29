import type { SectionStatus } from "../../../models/strategyTab";

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
