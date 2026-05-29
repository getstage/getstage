export function FigmaLinkPanel({
  compact,
  value,
  onChange,
  onSubmit,
}: {
  compact: boolean;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <div className={`flex flex-col gap-2 ${compact ? "w-[290px]" : "w-full max-w-[360px]"}`}>
      <label className="text-[13px] font-medium leading-[1.25] text-[#171717]" htmlFor="moodboard-figma-link">
        Paste Figma Link
      </label>
      <div className="flex items-center gap-2">
        <input
          id="moodboard-figma-link"
          type="url"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") onSubmit();
          }}
          placeholder="ex. www.google.com"
          className="h-[38px] min-w-0 flex-1 rounded-[6px] bg-[#F5F5F5] px-3 text-[12px] font-medium leading-[1.25] text-[#262626] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] outline-none placeholder:text-[#525252] focus:ring-2 focus:ring-[#8D87FF]/30"
        />
        {!compact ? (
          <button
            type="button"
            className="inline-flex h-[38px] shrink-0 cursor-pointer items-center justify-center rounded-[6px] border border-[rgba(158,153,248,0.75)] bg-gradient-to-b from-[#7B76DF] to-[#463FBA] px-3 text-[13px] font-medium leading-[1.25] text-[#FAFAFA] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-opacity hover:opacity-95"
            onClick={onSubmit}
          >
            Import
          </button>
        ) : null}
      </div>
    </div>
  );
}
