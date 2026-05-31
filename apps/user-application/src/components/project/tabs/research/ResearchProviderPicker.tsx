import type { ProviderId } from "@stage/data-ops/contracts";
import type { ResearchProviderOption } from "@/hooks/project/research/useResearchProviderSelection";

const PROVIDER_ICONS: Record<ProviderId, string> = {
  claude: "/logos/integrations/claude.svg",
  codex: "/logos/integrations/codex.svg",
};

export function ResearchProviderPicker({
  options,
  selectedProviderId,
  onSelect,
  error,
}: {
  options: ResearchProviderOption[];
  selectedProviderId: ProviderId | null;
  onSelect: (providerId: ProviderId) => void;
  error?: string;
}) {
  return (
    <div className="flex w-full flex-col gap-2">
      <p className="text-[13px] font-medium leading-none text-[#171717]">AI provider</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isSelected = selectedProviderId === option.id;

          return (
            <button
              key={option.id}
              type="button"
              disabled={!option.selectable}
              onClick={() => onSelect(option.id)}
              className={[
                "inline-flex min-w-[132px] flex-col items-start gap-1 rounded-[8px] border px-3 py-[10px] text-left transition-colors",
                isSelected
                  ? "border-[#7B76DF] bg-[#F5F4FF] shadow-[0_0.45px_1px_rgba(10,10,10,0.15)]"
                  : "border-transparent bg-[#F5F5F5] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] hover:bg-[#EFEFEF]",
                !option.selectable ? "cursor-not-allowed opacity-50" : "",
              ].join(" ")}
            >
              <span className="inline-flex items-center gap-2">
                <img src={PROVIDER_ICONS[option.id]} alt="" aria-hidden="true" className="h-4 w-4" />
                <span className="text-[13px] font-medium leading-none text-[#171717]">{option.label}</span>
              </span>
              {option.statusMessage ? (
                <span className="text-[11px] font-medium leading-[1.4] text-[#737373]">{option.statusMessage}</span>
              ) : null}
            </button>
          );
        })}
      </div>
      {error ? <p className="text-[12px] font-medium leading-[1.4] text-[#DC2626]">{error}</p> : null}
    </div>
  );
}
