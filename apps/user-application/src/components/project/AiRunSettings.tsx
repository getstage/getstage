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
}: {
  providerOptions: ResearchProviderOption[];
  selectedProviderId: ProviderId | null;
  onSelectProvider: (providerId: ProviderId) => void;
  providerError?: string;
}) {
  return (
    <div className="flex w-full flex-col gap-4">
      <ResearchProviderPicker
        options={providerOptions}
        selectedProviderId={selectedProviderId}
        onSelect={onSelectProvider}
        error={providerError}
      />
      <AiModeToggle />
    </div>
  );
}
