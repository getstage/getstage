import { FigmaIcon, PlusIcon } from "./flowsIcons";

export function FlowHeaderActions({ onAddFlow }: { onAddFlow: () => void }) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <button
        type="button"
        onClick={onAddFlow}
        className="inline-flex h-[32px] items-center gap-2 rounded-[6px] bg-white px-3 text-[13px] font-medium leading-[1.25] text-[#525252] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#FAFAFA]"
      >
        <PlusIcon />
        Add a flow manually
      </button>
      <button
        type="button"
        className="inline-flex h-[32px] items-center gap-2 rounded-[6px] bg-gradient-to-b from-[#262626] to-[#0A0A0A] px-3 text-[13px] font-medium leading-[1.25] text-white shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-opacity hover:opacity-90"
      >
        <FigmaIcon />
        Send to FigJam
      </button>
    </div>
  );
}
