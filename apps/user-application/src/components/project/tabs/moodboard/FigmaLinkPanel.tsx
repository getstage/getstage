import { GenerateWithAiIcon } from "./moodboardIcons";

export function GenerateWithAiButton({
  disabled,
  onClick,
}: {
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      className="inline-flex h-8 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-[6px] border border-[#525252] bg-gradient-to-b from-[#404040] to-[#0A0A0A] px-3 text-[13px] font-medium leading-none text-[#FAFAFA] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
      onClick={onClick}
    >
      <GenerateWithAiIcon />
      Generate with AI
    </button>
  );
}

export function FigmaLinkPanel({
  compact,
  disabled,
  loading = false,
  value,
  onChange,
  onSubmit,
}: {
  compact: boolean;
  disabled?: boolean;
  loading?: boolean;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <div className={`flex flex-col gap-2 ${compact ? "w-full" : "w-full max-w-[611px]"}`}>
      <div className="flex flex-col gap-2">
        <label className="text-[13px] font-medium leading-none text-[#171717]" htmlFor="moodboard-figma-link">
          Paste Figma Link or Image URL
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <input
            id="moodboard-figma-link"
            type="url"
            value={value}
            disabled={disabled}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") onSubmit();
            }}
            placeholder="ex. figma.com/design/... or https://example.com/image.png"
            className="h-8 w-[290px] max-w-full rounded-[6px] bg-[#F5F5F5] px-3 text-[12px] font-medium leading-none text-[#262626] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] outline-none placeholder:text-[#525252]"
          />
          <button
            type="button"
            disabled={disabled}
            className="inline-flex h-8 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-[6px] border border-[#525252] bg-gradient-to-b from-[#404040] to-[#0A0A0A] px-3 text-[13px] font-medium leading-none text-[#FAFAFA] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={onSubmit}
          >
            {loading ? (
              <>
                <img src="/logos/loader.svg" alt="" aria-hidden="true" className="h-[14px] w-[14px] animate-spin" />
                Importing...
              </>
            ) : (
              "Import"
            )}
          </button>
          {loading ? <span className="sr-only" role="status">Importing images from Figma</span> : null}
        </div>
      </div>
    </div>
  );
}

export function GenerateWithAiPanel({
  compact,
  disabled,
  value,
  onChange,
  onSubmit,
}: {
  compact: boolean;
  disabled?: boolean;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <div className={`flex flex-col gap-2 ${compact ? "w-full" : "w-full max-w-[611px]"}`}>
      <label className="text-[13px] font-medium leading-none text-[#171717]" htmlFor="moodboard-refero-query">
        Search Refero
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <input
          id="moodboard-refero-query"
          type="text"
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") onSubmit();
          }}
          placeholder="dashboard empty states"
          className="h-8 w-[290px] max-w-full rounded-[6px] bg-[#F5F5F5] px-3 text-[12px] font-medium leading-none text-[#262626] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] outline-none placeholder:text-[#525252] disabled:cursor-not-allowed disabled:opacity-60"
        />
        <button
          type="button"
          disabled={disabled}
          className="inline-flex h-8 shrink-0 cursor-pointer items-center justify-center rounded-[6px] border border-[#525252] bg-gradient-to-b from-[#404040] to-[#0A0A0A] px-3 text-[13px] font-medium leading-none text-[#FAFAFA] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
          onClick={onSubmit}
        >
          Generate
        </button>
      </div>
    </div>
  );
}
