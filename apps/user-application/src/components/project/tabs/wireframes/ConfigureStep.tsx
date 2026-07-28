import type { ProviderId } from "@stage/data-ops/contracts";
import { AiRunSettings } from "@/components/project/AiRunSettings";
import type { ResearchProviderOption } from "@/hooks/project/research/useResearchProviderSelection";
import type { ScreenItem, WireframeKind } from "@/types/project/wireframesTab";
import { Badge, PrimaryButton, SecondaryButton } from "./WireframePrimitives";
import { WireframeRunSelection } from "./WireframeRunSelection";
import { ArrowLeftIcon, ArrowRightIcon, CheckIcon, PlusIcon } from "./wireframesIcons";

export function ConfigureStep({
  wireframeKind,
  screens,
  selectedCount,
  skillIds,
  componentPackIds,
  onSaveSkills,
  providerOptions,
  selectedProviderId,
  onSelectProvider,
  onChangeType,
  onAddBrandKit,
  onToggle,
  onGenerate,
}: {
  wireframeKind: WireframeKind;
  screens: ScreenItem[];
  selectedCount: number;
  skillIds: readonly string[];
  componentPackIds: readonly string[];
  onSaveSkills: (input: { skillIds: string[]; componentPackIds: string[] }) => Promise<void>;
  providerOptions: ResearchProviderOption[];
  selectedProviderId: ProviderId | null;
  onSelectProvider: (providerId: ProviderId) => void;
  onChangeType: () => void;
  onAddBrandKit: () => void;
  onToggle: (id: string) => void;
  onGenerate: () => void;
}) {
  return (
    <div className="rounded-[12px] bg-[#F5F5F5] p-1 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
      <div className="flex flex-col gap-[10px] p-4">
        <div>
          <h2 className="text-[15px] font-medium leading-[1.25] text-[#0A0A0A]">
            Generate Wireframes
          </h2>
          <p className="mt-[10px] max-w-[354px] text-[12px] font-medium leading-[1.5] text-[#525252]">
            AI will produce low-fidelity block layouts for every screen. You&apos;ll take them into Figma for the High-fidelity design pass.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 text-[13px] font-medium leading-[1.25]">
            <span className="text-[#171717]">{screens.length} screens from Flows</span>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3">
            <SecondaryButton onClick={onChangeType}>
              <ArrowLeftIcon />
              Change Wireframe type
            </SecondaryButton>
            {wireframeKind === "lofi" ? (
              <SecondaryButton purple onClick={onAddBrandKit}>
                <PlusIcon />
                Add Brand Kit
              </SecondaryButton>
            ) : null}
          </div>
        </div>
      </div>

      {wireframeKind === "hifi" ? (
        <div className="mb-1">
          <WireframeRunSelection
            skillIds={skillIds}
            componentPackIds={componentPackIds}
            onSave={onSaveSkills}
          />
        </div>
      ) : null}

      <div className="rounded-[8px] bg-white p-11 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
        <div className="mb-6 flex items-center justify-between text-[15px] font-medium leading-[1.25] text-[#171717]">
          <span>Screens To Generate</span>
          <span className="text-[13px] text-[#525252]">
            {selectedCount} of {screens.length} selected
          </span>
        </div>
        <div className="flex flex-col gap-1">
          {screens.map((screen) => (
            <ScreenRow key={screen.id} screen={screen} onToggle={() => onToggle(screen.id)} />
          ))}
        </div>
        <label className="mt-6 block">
          <span className="mb-2 flex gap-2 text-[13px] font-medium leading-[1.25]">
            <span className="text-[#171717]">Layout Preference</span>
            <span className="text-[#737373]">(Optional)</span>
          </span>
          <textarea
            className="h-[84px] w-full resize-none rounded-[6px] bg-[#F5F5F5] px-3 py-[10px] text-[12px] font-medium leading-[1.25] text-[#525252] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] outline-none transition-shadow placeholder:text-[#737373] focus:shadow-[0_0_0_1px_#8D87FF]"
            placeholder="ex. sticky header with primary CTA, wide hero, keep forms short, mobile-first density..."
          />
        </label>
        <div className="mt-6 border-t border-[#E5E5E5] pt-6">
          <AiRunSettings
            providerOptions={providerOptions}
            selectedProviderId={selectedProviderId}
            onSelectProvider={onSelectProvider}
          />
        </div>
        <div className="mt-6 flex justify-end">
          <PrimaryButton onClick={onGenerate} disabled={!selectedProviderId}>
            Generate {selectedCount} Wireframes
            <ArrowRightIcon />
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}

export function ScreenRow({ screen, onToggle }: { screen: ScreenItem; onToggle: () => void }) {
  return (
    <article className="rounded-[8px] bg-[#FAFAFA] p-[2px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
      <div className="flex items-end justify-between gap-4 rounded-[6px] p-4">
        <button
          type="button"
          onClick={onToggle}
          className="flex min-w-0 flex-1 items-start gap-[6px] text-left disabled:cursor-default"
          aria-pressed={screen.selected}
        >
          <span
            className={`mt-[1px] flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] ${
              screen.selected ? "bg-[#0A0A0A] text-white" : "bg-[#E5E5E5] text-transparent"
            }`}
          >
            <CheckIcon />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[13px] font-medium leading-[1.25] text-[#171717]">
              {screen.title}
            </span>
            <span className="mt-[7px] block truncate text-[12px] font-normal leading-[1.5] text-[#525252]">
              {screen.description}
            </span>
          </span>
        </button>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
          <Badge tone="blue">{screen.kind}</Badge>
          <Badge tone="rose">{screen.priority}</Badge>
          <Badge tone="stone">{screen.required ? "Recommended" : "Optional"}</Badge>
        </div>
      </div>
    </article>
  );
}
