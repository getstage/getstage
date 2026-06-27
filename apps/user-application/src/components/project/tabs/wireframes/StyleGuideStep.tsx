import { PrimaryButton } from "./WireframePrimitives";
import { ArrowRightIcon, MonitorIcon } from "./wireframesIcons";

type StyleDirection = {
  id: string;
  title: string;
  count: number;
  images: string[];
};

export function StyleGuideStep({
  directions,
  selectedDirectionId,
  onSelectDirection,
  onGenerateStyleGuide,
  onContinue,
}: {
  directions: StyleDirection[];
  selectedDirectionId: string | null;
  onSelectDirection: (directionId: string) => void;
  onGenerateStyleGuide: () => void;
  onContinue: () => void;
}) {
  return (
    <div className="flex min-h-[640px] w-full items-center justify-center rounded-[8px] bg-white px-4 py-11 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
      <div className="flex w-full max-w-[1133px] flex-col items-center gap-[6px]">
        <div className="flex w-[357px] max-w-full flex-col gap-1 px-3 pb-3 pt-2">
          <h2 className="text-[13px] font-semibold leading-[1.5] text-[#0A0A0A]">
            Choose Style Guide
          </h2>
          <p className="text-[12px] font-medium leading-[1.5] text-[#525252]">
            Select the style guide you want to use for wireframes
          </p>
        </div>

        <div className="flex w-full flex-col items-center gap-2 py-3">
          <div className="flex w-full flex-wrap justify-center gap-2">
            {directions.map((direction) => (
              <StyleDirectionCard
                key={direction.id}
                direction={direction}
                selected={selectedDirectionId === direction.id}
                anySelected={selectedDirectionId !== null}
                onSelect={() => onSelectDirection(direction.id)}
              />
            ))}
          </div>
          {directions.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12">
              <p className="max-w-[357px] text-center text-[13px] font-medium text-[#737373]">
                You don&apos;t have a style guide yet. Generate one in the Moodboard Direction Hub.
              </p>
              <PrimaryButton onClick={onGenerateStyleGuide} className="w-[357px] max-w-full">
                Generate a Style Guide
                <ArrowRightIcon />
              </PrimaryButton>
            </div>
          ) : null}
        </div>

        {directions.length > 0 ? (
          <PrimaryButton
            onClick={onContinue}
            disabled={!selectedDirectionId}
            className="w-[357px] max-w-full"
          >
            Continue
            <ArrowRightIcon />
          </PrimaryButton>
        ) : null}

      </div>
    </div>
  );
}

function StyleDirectionCard({
  direction,
  selected,
  anySelected,
  onSelect,
}: {
  direction: StyleDirection;
  selected: boolean;
  anySelected: boolean;
  onSelect: () => void;
}) {
  return (
    <article
      className={`flex h-[336px] w-[360px] max-w-full flex-col rounded-[8px] bg-[#FAFAFA] p-[2px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-opacity ${
        anySelected && !selected ? "opacity-50" : "opacity-100"
      }`}
    >
      <div className="grid min-h-0 flex-1 grid-cols-2 gap-2 overflow-hidden rounded-[6px] bg-white p-2 shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
        {direction.images.map((src, index) => (
          <div
            key={`${direction.id}-${src}-${index}`}
            className="relative min-h-0 overflow-hidden rounded-[4px] border border-[#E5E5E5]"
          >
            <img src={src} alt="" className="h-full w-full object-cover" />
          </div>
        ))}
      </div>

      <div className="flex items-start gap-3 px-4 py-3">
        <div className="flex min-w-0 flex-1 flex-col items-start gap-2">
          <h3 className="truncate text-[15px] font-medium leading-[1.25] text-[#171717]">
            {direction.title}
          </h3>
          <span className="inline-flex h-[20px] items-center justify-center gap-[6px] rounded-[4px] bg-[#E5E5E5] px-[6px] text-[12px] font-medium leading-[1.5] text-[#525252]">
            <MonitorIcon />
            {direction.count}
          </span>
        </div>

        <button
          type="button"
          onClick={onSelect}
          className={`inline-flex h-[27px] shrink-0 items-center justify-center gap-2 rounded-[4px] border px-2 text-[12px] font-medium leading-[1.25] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] ${
            selected
              ? "border-[#525252] bg-[#171717] text-white"
              : "border-[#D4D4D4] bg-white text-[#171717]"
          }`}
        >
          {selected ? "Selected" : `Use ${direction.title}`}
          <ArrowRightIcon />
        </button>
      </div>
    </article>
  );
}
