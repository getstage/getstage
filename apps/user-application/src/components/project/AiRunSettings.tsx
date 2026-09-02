import type { ProviderId } from "@stage/data-ops/contracts";
import { ResearchProviderPicker } from "@/components/project/tabs/research/ResearchProviderPicker";
import { responseSpeeds, useChatDefaults } from "@/hooks/engine/useChatDefaults";
import type { ResearchProviderOption } from "@/hooks/project/research/useResearchProviderSelection";

function AiModeToggle() {
  const chatDefaults = useChatDefaults();

  return (
    <fieldset className="min-w-0">
      <legend className="mb-[6px] text-[11px] font-medium leading-none text-[#737373]">
        Mode
      </legend>
      <div
        className="grid max-w-[200px] gap-[3px] rounded-[6px] bg-[#F5F5F5] p-[3px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.18)]"
        style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}
      >
        {responseSpeeds.map((option) => {
          const selected = chatDefaults.defaults.responseSpeed === option.id;

          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={selected}
              onClick={() => chatDefaults.setDefaults({ responseSpeed: option.id })}
              className={`min-h-[26px] min-w-0 truncate rounded-[5px] px-[8px] text-[12px] font-medium leading-none transition-colors ${
                selected
                  ? "bg-white text-[#171717] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.18)]"
                  : "text-[#525252] hover:bg-[#ECECEC]"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function AiRunSettings({
  providerOptions,
  selectedProviderId,
  onSelectProvider,
  providerError,
  nebiusSelected,
  onSelectNebius,
}: {
  providerOptions: ResearchProviderOption[];
  selectedProviderId: ProviderId | null;
  onSelectProvider: (providerId: ProviderId) => void;
  providerError?: string;
  nebiusSelected?: boolean;
  onSelectNebius?: () => void;
}) {
  return (
    <div className="flex w-full flex-col gap-4">
      <ResearchProviderPicker
        options={providerOptions}
        selectedProviderId={nebiusSelected ? null : selectedProviderId}
        onSelect={onSelectProvider}
        error={providerError}
      />
      {onSelectNebius ? (
        <button
          type="button"
          onClick={onSelectNebius}
          className={[
            "inline-flex min-w-[132px] flex-col items-start gap-1 self-start rounded-[8px] border px-3 py-[10px] text-left transition-colors",
            nebiusSelected
              ? "border-[#7B76DF] bg-[#F5F4FF] shadow-[0_0.45px_1px_rgba(10,10,10,0.15)]"
              : "border-transparent bg-[#F5F5F5] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] hover:bg-[#EFEFEF]",
          ].join(" ")}
        >
          <span className="text-[13px] font-medium leading-none text-[#171717]">Nebius</span>
          <span className="text-[11px] font-medium leading-[1.4] text-[#737373]">
            Hi-Fi via local gateway
          </span>
        </button>
      ) : null}
      <AiModeToggle />
    </div>
  );
}
