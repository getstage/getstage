import type { MoodboardItem } from "@/data/fixtures/project/moodboardTabFixtures";
import { useState } from "react";
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
  onRenameDirection,
  onGenerateStyleGuide,
}: {
  directions: Direction[];
  items: MoodboardItem[];
  onNewDirection: () => void;
  onAll: () => void;
  onRenameDirection: (previousName: string, nextName: string) => void;
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
            count={items.filter((item) => item.folder === direction.name).length}
            images={items.filter((item) => item.folder === direction.name).slice(0, 6)}
            onRename={(nextName) => onRenameDirection(direction.name, nextName)}
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
  onRename,
  onGenerate,
}: {
  direction: Direction;
  count: number;
  images: MoodboardItem[];
  onRename: (nextName: string) => void;
  onGenerate: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(direction.name);

  function commitRename() {
    const nextName = draftName.trim();
    if (!nextName || nextName === direction.name) {
      setDraftName(direction.name);
      setEditing(false);
      return;
    }

    onRename(nextName);
    setEditing(false);
  }

  return (
    <article className="flex h-[336px] min-w-0 flex-col rounded-[8px] bg-[#FAFAFA] p-[2px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
      <div className="grid min-h-0 flex-1 grid-cols-2 gap-2 overflow-hidden rounded-[6px] bg-white p-2 shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
        {images.length > 0 ? images.map((item, index) => (
          <div
            key={`${direction.name}-${item.id}-${index}`}
            className="relative min-h-0 overflow-hidden rounded-[4px] border border-[#E5E5E5]"
          >
            <img src={item.image} alt="" className="h-full w-full object-cover" />
            {index === 1 ? <div className="absolute inset-0 bg-black/35" /> : null}
          </div>
        )) : (
          <div className="col-span-2 flex min-h-0 items-center justify-center rounded-[4px] border border-dashed border-[#D4D4D4] bg-[#FAFAFA] px-4 text-center text-[12px] font-medium leading-[1.4] text-[#737373]">
            Add references to this direction
          </div>
        )}
      </div>

      <div className="flex items-start gap-3 px-4 py-3">
        <div className="flex min-w-0 flex-1 flex-col items-start gap-2">
          {editing ? (
            <input
              value={draftName}
              onChange={(event) => setDraftName(event.target.value)}
              onBlur={commitRename}
              onKeyDown={(event) => {
                if (event.key === "Enter") commitRename();
                if (event.key === "Escape") {
                  setDraftName(direction.name);
                  setEditing(false);
                }
              }}
              autoFocus
              className="h-[24px] w-full min-w-0 rounded-[4px] bg-white px-2 text-[15px] font-medium leading-[1.25] text-[#171717] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] outline-none"
            />
          ) : (
            <button
              type="button"
              className="max-w-full truncate text-left text-[15px] font-medium leading-[1.25] text-[#171717] underline-offset-2 hover:underline"
              onClick={() => {
                setDraftName(direction.name);
                setEditing(true);
              }}
            >
              {direction.name}
            </button>
          )}
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
