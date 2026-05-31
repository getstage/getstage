import { ArrowRightIcon, NotionIcon, PlusIcon } from "./researchIcons";

export function ResearchActions({ onGenerateStrategy }: { onGenerateStrategy: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <button type="button" className="inline-flex h-8 items-center gap-2 rounded-[6px] text-[13px] font-medium leading-[1.25] text-[#525252] transition-colors hover:text-[#171717]">
        <PlusIcon />
        Add Section
      </button>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="inline-flex h-[31px] items-center gap-[6px] rounded-[6px] bg-[#F5F5F5] px-2 text-[13px] font-medium leading-[1.25] text-[#525252] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#ECECEC]">
          <NotionIcon />
          Export to Notion
        </button>
        <button
          type="button"
          onClick={onGenerateStrategy}
          className="inline-flex h-8 items-center justify-center gap-2 rounded-[6px] border border-[rgba(158,153,248,0.75)] bg-gradient-to-b from-[#7B76DF] to-[#463FBA] px-3 text-[13px] font-medium leading-[1.25] text-[#FAFAFA] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-opacity hover:opacity-95"
        >
          Generate Strategy
          <ArrowRightIcon />
        </button>
      </div>
    </div>
  );
}
