import type { MoodboardItem } from "@/data/fixtures/project/moodboardTabFixtures";
import { MOODBOARD_DIRECTION_REFERENCE_COUNTS } from "@/mock/project/moodboard";
import { DirectionToggle } from "./DirectionToggle";
import { ArrowRightIcon, DirectionIcon, MonitorIcon } from "./moodboardIcons";

export type Direction = {
  name: string;
  hasStyleGuide?: boolean;
};

export function DirectionHub({
  directions,
  items,
  onNewDirection,
  onAll,
  onGenerateStyleGuide,
}: {
  directions: Direction[];
  items: MoodboardItem[];
  onNewDirection: () => void;
  onAll: () => void;
  onGenerateStyleGuide: (direction: string) => void;
}) {
  return (
    <div className="rounded-[8px] bg-white p-4 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <DirectionToggle activeView="hub" onAll={onAll} onDirectionHub={() => undefined} />
        <button
          type="button"
          className="inline-flex h-8 items-center justify-center gap-2 rounded-[6px] border border-[#525252] bg-gradient-to-b from-[#404040] to-[#0A0A0A] pl-3 pr-[10px] text-[13px] font-medium leading-[1.25] text-[#FAFAFA] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]"
          onClick={onNewDirection}
        >
          New Direction
          <DirectionIcon />
        </button>
      </div>

      <div className="grid gap-2 lg:grid-cols-3">
        {directions.map((direction, index) => (
          <DirectionCard
            key={direction.name}
            direction={direction}
            count={MOODBOARD_DIRECTION_REFERENCE_COUNTS[index] ?? 9}
            images={(items.filter((item) => item.folder === direction.name).length > 0
              ? items.filter((item) => item.folder === direction.name)
              : items
            ).slice(0, 6)}
            onGenerate={() => onGenerateStyleGuide(direction.name)}
          />
        ))}
      </div>
    </div>
  );
}

function DirectionCard({
  direction,
  count,
  images,
  onGenerate,
}: {
  direction: Direction;
  count: number;
  images: MoodboardItem[];
  onGenerate: () => void;
}) {
  return (
    <article className="flex h-[336px] min-w-0 flex-col rounded-[8px] bg-[#FAFAFA] p-[2px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
      <div className="grid min-h-0 flex-1 grid-cols-2 gap-2 overflow-hidden rounded-[6px] bg-white p-2 shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
        {images.map((item, index) => (
          <div
            key={`${direction.name}-${item.id}-${index}`}
            className="relative min-h-0 overflow-hidden rounded-[4px] border border-[#E5E5E5]"
          >
            <img src={item.image} alt="" className="h-full w-full object-cover" />
            {index === 1 ? <div className="absolute inset-0 bg-black/35" /> : null}
          </div>
        ))}
      </div>

      <div className="flex items-start gap-3 px-4 py-3">
        <div className="flex min-w-0 flex-1 flex-col items-start gap-2">
          <h3 className="truncate text-[15px] font-medium leading-[1.25] text-[#171717]">
            {direction.name}
          </h3>
          <span className="inline-flex h-[20px] items-center justify-center gap-[6px] rounded-[4px] bg-[#E5E5E5] px-[6px] text-[12px] font-medium leading-[1.5] text-[#525252]">
            <MonitorIcon />
            {count}
          </span>
        </div>
        <button
          type="button"
          className="inline-flex h-[27px] shrink-0 items-center justify-center gap-2 rounded-[4px] border border-[#D4D4D4] bg-white px-2 text-[12px] font-medium leading-[1.25] text-[#171717] transition-colors hover:bg-[#F5F5F5]"
          onClick={onGenerate}
        >
          {direction.hasStyleGuide ? "View Style Guide" : "Generate Style Guide"}
          <ArrowRightIcon />
        </button>
      </div>
    </article>
  );
}
