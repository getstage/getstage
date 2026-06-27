import type { MoodboardItem } from "@/data/fixtures/project/moodboardTabFixtures";
import { useEffect, useState } from "react";
import { DirectionToggle } from "./DirectionToggle";
import { ArrowRightIcon, DirectionIcon, MonitorIcon } from "./moodboardIcons";

export type Direction = {
  name: string;
  hasStyleGuide?: boolean;
};

export function DirectionHub({
  directions,
  items,
  editingDirectionName,
  onNewDirection,
  onAll,
  onOpenDirection,
  onRenameDirection,
  onDeleteDirection,
  onGenerateStyleGuide,
}: {
  directions: Direction[];
  items: MoodboardItem[];
  editingDirectionName?: string;
  onNewDirection: () => void;
  onAll: () => void;
  onOpenDirection: (name: string) => void;
  onRenameDirection: (previousName: string, nextName: string) => void;
  onDeleteDirection: (name: string) => void;
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
        {directions.map((direction) => (
          <DirectionCard
            key={direction.name}
            direction={direction}
            initialEditing={direction.name === editingDirectionName}
            count={items.filter((item) => item.folder === direction.name).length}
            images={items.filter((item) => item.folder === direction.name).slice(0, 6)}
            onOpen={() => onOpenDirection(direction.name)}
            onRename={(nextName) => onRenameDirection(direction.name, nextName)}
            onDelete={() => onDeleteDirection(direction.name)}
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
  initialEditing = false,
  onOpen,
  onRename,
  onDelete,
  onGenerate,
}: {
  direction: Direction;
  count: number;
  images: MoodboardItem[];
  initialEditing?: boolean;
  onOpen: () => void;
  onRename: (nextName: string) => void;
  onDelete: () => void;
  onGenerate: () => void;
}) {
  const [editing, setEditing] = useState(initialEditing);
  const [draftName, setDraftName] = useState(direction.name);
  const [menuOpen, setMenuOpen] = useState(false);

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

  function startRename() {
    setMenuOpen(false);
    setDraftName(direction.name);
    setEditing(true);
  }

  return (
    <article className="flex h-[336px] min-w-0 flex-col rounded-[8px] bg-[#FAFAFA] p-[2px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Open ${direction.name}`}
        className="grid min-h-0 flex-1 grid-cols-2 gap-2 overflow-hidden rounded-[6px] bg-white p-2 text-left shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] transition-shadow hover:shadow-[0_1px_3px_rgba(10,10,10,0.25)]"
      >
        {images.length > 0 ? images.map((item, index) => (
          <div
            key={`${direction.name}-${item.id}-${index}`}
            className="relative min-h-0 overflow-hidden rounded-[4px] border border-[#E5E5E5]"
          >
            <DirectionPreviewImage item={item} />
          </div>
        )) : (
          <div className="col-span-2 flex min-h-0 items-center justify-center rounded-[4px] border border-dashed border-[#D4D4D4] bg-[#FAFAFA] px-4 text-center text-[12px] font-medium leading-[1.4] text-[#737373]">
            Add references to this direction
          </div>
        )}
      </button>

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
              className="line-clamp-2 max-w-full break-words text-left text-[15px] font-medium leading-[1.25] text-[#171717] underline-offset-2 hover:underline"
              onClick={onOpen}
            >
              {direction.name}
            </button>
          )}
          <span className="inline-flex h-[20px] items-center justify-center gap-[6px] rounded-[4px] bg-[#E5E5E5] px-[6px] text-[12px] font-medium leading-[1.5] text-[#525252]">
            <MonitorIcon />
            {count}
          </span>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <div className="relative">
            <button
              type="button"
              aria-label="Direction options"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className="inline-flex h-[27px] w-[27px] items-center justify-center rounded-[4px] bg-white text-[#525252] shadow-[0_0.45px_1px_rgba(10,10,10,0.2)] transition-colors hover:bg-[#F5F5F5]"
              onClick={() => setMenuOpen((current) => !current)}
            >
              <EllipsisIcon />
            </button>
            {menuOpen ? (
              <>
                <button
                  type="button"
                  aria-hidden="true"
                  tabIndex={-1}
                  className="fixed inset-0 z-10 cursor-default"
                  onClick={() => setMenuOpen(false)}
                />
                <div
                  role="menu"
                  className="absolute right-0 z-20 mt-1 w-[148px] overflow-hidden rounded-[8px] border border-[#E5E5E5] bg-white py-1 shadow-[0_4px_16px_rgba(10,10,10,0.18)]"
                >
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center px-3 py-[7px] text-left text-[13px] font-medium leading-[1.25] text-[#171717] transition-colors hover:bg-[#F5F5F5]"
                    onClick={startRename}
                  >
                    Rename direction
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center px-3 py-[7px] text-left text-[13px] font-medium leading-[1.25] text-[#EF4444] transition-colors hover:bg-[#FEF2F2]"
                    onClick={() => {
                      setMenuOpen(false);
                      onDelete();
                    }}
                  >
                    Delete direction
                  </button>
                </div>
              </>
            ) : null}
          </div>
          <button
            type="button"
            className="inline-flex h-[27px] items-center justify-center gap-2 rounded-[4px] border border-[#D4D4D4] bg-white px-2 text-[12px] font-medium leading-[1.25] text-[#171717] transition-colors hover:bg-[#F5F5F5]"
            onClick={onGenerate}
          >
            {direction.hasStyleGuide ? "View Style Guide" : "Generate Style Guide"}
            <ArrowRightIcon />
          </button>
        </div>
      </div>
    </article>
  );
}

function EllipsisIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className="h-[16px] w-[16px]" aria-hidden="true">
      <circle cx="8" cy="3.5" r="1.4" />
      <circle cx="8" cy="8" r="1.4" />
      <circle cx="8" cy="12.5" r="1.4" />
    </svg>
  );
}

function directionPreviewSources(item: MoodboardItem) {
  return [item.thumbnailUrl, item.image, item.imageUrl, item.sourceUrl]
    .filter((src): src is string => Boolean(src && /^(https?:|data:|blob:)/i.test(src)))
    .filter((src, index, values) => values.indexOf(src) === index);
}

function DirectionPreviewImage({ item }: { item: MoodboardItem }) {
  const sources = directionPreviewSources(item);
  const [sourceIndex, setSourceIndex] = useState(0);

  // When the rendered item changes, restart from its first source so one broken
  // image can't leave the next item showing a wrong fallback index.
  useEffect(() => {
    setSourceIndex(0);
  }, [item.id, item.image, item.thumbnailUrl, item.imageUrl, item.sourceUrl]);

  const src = sources[sourceIndex];
  if (!src) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#F5F5F5] px-3 text-center text-[11px] font-medium leading-[1.35] text-[#737373]">
        Image unavailable
      </div>
    );
  }

  return (
    <img
      src={src}
      alt=""
      className="h-full w-full object-cover"
      onError={() => setSourceIndex((current) => current + 1)}
    />
  );
}
