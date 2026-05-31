import { useState } from "react";
import { PrimaryButton } from "./WireframePrimitives";
import { ArrowLeftIcon, ArrowRightIcon, CloseSmallIcon, MonitorIcon } from "./wireframesIcons";

const STYLE_DIRECTIONS = [
  { id: 1, title: "Direction 1", count: 24 },
  { id: 2, title: "Direction 2", count: 12 },
  { id: 3, title: "Direction 3", count: 43 },
];

const STYLE_IMAGES = [
  "/images/moodboard/reference-1.png",
  "/images/moodboard/reference-2.png",
  "/images/moodboard/reference-3.png",
  "/images/moodboard/reference-1.png",
  "/images/moodboard/reference-2.png",
  "/images/moodboard/reference-3.png",
];

export function StyleGuideStep({
  onBack,
  onContinue,
}: {
  onBack: () => void;
  onContinue: () => void;
}) {
  const [selectedDirection, setSelectedDirection] = useState<number | null>(null);

  return (
    <div className="flex min-h-[640px] w-full items-center justify-center rounded-[8px] bg-white px-4 py-11 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
      <div className="flex w-full max-w-[1133px] flex-col items-center gap-[6px]">
        <div className="flex w-[357px] max-w-full flex-col gap-1 px-3 pb-3 pt-2">
          <h2 className="text-[13px] font-semibold leading-[1.5] text-[#0A0A0A]">
            Choose Style Guide
          </h2>
          <p className="text-[12px] font-medium leading-[1.5] text-[#525252]">
            Select the style guide you want to use for moodboard
          </p>
        </div>

        <div className="flex w-full flex-col items-center gap-2 py-3">
          <div className="grid w-full gap-2 lg:grid-cols-3">
            {STYLE_DIRECTIONS.map((direction) => (
              <StyleDirectionCard
                key={direction.id}
                direction={direction}
                selected={selectedDirection === direction.id}
                anySelected={selectedDirection !== null}
                onSelect={() => setSelectedDirection(direction.id)}
              />
            ))}
          </div>

          <div className="flex items-start gap-1 rounded-[8px] bg-[#F5F5F5] p-[2px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
            <button
              type="button"
              className="flex h-[27px] w-[27px] items-center justify-center rounded-[6px] text-[#525252] transition-colors hover:bg-white"
              aria-label="Previous style directions"
            >
              <span className="rotate-180">
                <ArrowRightIcon />
              </span>
            </button>
            <button
              type="button"
              className="flex h-[27px] w-[27px] items-center justify-center rounded-[6px] bg-white text-[#171717] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]"
              aria-label="Next style directions"
            >
              <ArrowRightIcon />
            </button>
          </div>
        </div>

        <PrimaryButton onClick={onContinue} className="w-[357px] max-w-full">
          Continue
          <ArrowRightIcon />
        </PrimaryButton>

        <button
          type="button"
          onClick={onBack}
          className="mt-2 inline-flex items-center gap-2 text-[13px] font-medium leading-[1.25] text-[#525252] transition-colors hover:text-[#171717]"
        >
          <ArrowLeftIcon />
          Back
        </button>
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
  direction: (typeof STYLE_DIRECTIONS)[number];
  selected: boolean;
  anySelected: boolean;
  onSelect: () => void;
}) {
  return (
    <article
      className={`flex h-[336px] min-w-0 flex-col rounded-[8px] bg-[#FAFAFA] p-[2px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-opacity ${
        anySelected && !selected ? "opacity-50" : "opacity-100"
      }`}
    >
      <div className="grid min-h-0 flex-1 grid-cols-2 gap-2 overflow-hidden rounded-[6px] bg-white p-2 shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
        {STYLE_IMAGES.map((src, index) => (
          <div
            key={`${direction.id}-${src}-${index}`}
            className="relative min-h-0 overflow-hidden rounded-[4px] border border-[#E5E5E5]"
          >
            <img src={src} alt="" className="h-full w-full object-cover" />
            {index === 1 ? <div className="absolute inset-0 bg-black/35" /> : null}
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

        {selected ? (
          <button
            type="button"
            onClick={onSelect}
            className="inline-flex h-[27px] shrink-0 items-center justify-center gap-2 rounded-[4px] border border-[#525252] bg-gradient-to-b from-[#404040] to-[#0A0A0A] pl-2 pr-[6px] text-[12px] font-medium leading-[1.25] text-[#FAFAFA] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]"
          >
            Selected Direction
            <CloseSmallIcon />
          </button>
        ) : (
          <button
            type="button"
            onClick={onSelect}
            className="inline-flex h-[27px] shrink-0 items-center justify-center gap-2 rounded-[4px] border border-[#D4D4D4] bg-white px-2 text-[12px] font-medium leading-[1.25] text-[#171717] transition-colors hover:bg-[#F5F5F5]"
          >
            Use {direction.title}
            <ArrowRightIcon />
          </button>
        )}
      </div>
    </article>
  );
}
