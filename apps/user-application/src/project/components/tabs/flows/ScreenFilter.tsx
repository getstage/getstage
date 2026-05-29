import { ChevronDownIcon } from "./flowsIcons";

export function ScreenFilter({ screenTotal }: { screenTotal: number }) {
  return (
    <button
      type="button"
      className="inline-flex h-[32px] items-center gap-1 rounded-[6px] bg-white py-2 pl-3 pr-[14px] text-[13px] font-medium leading-[1.25] text-[#404040] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#FAFAFA]"
    >
      <span>All</span>
      <span className="opacity-50">({screenTotal})</span>
      <ChevronDownIcon />
    </button>
  );
}
