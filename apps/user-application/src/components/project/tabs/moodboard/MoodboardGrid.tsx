import type { MoodboardItem } from "@/data/fixtures/project/moodboardTabFixtures";
import { CheckIcon } from "./moodboardIcons";

export function MoodboardGrid({
  items,
  selectedIds,
  onToggleSelect,
}: {
  items: MoodboardItem[];
  selectedIds: Set<string>;
  onToggleSelect: (itemId: string) => void;
}) {
  return (
    <div className="grid w-full grid-cols-1 gap-1 md:grid-cols-3">
      {items.map((item) => {
        const isSelected = selectedIds.has(item.id);
        return (
          <button
            key={item.id}
            type="button"
            className="relative min-w-0 cursor-pointer rounded-[8px] bg-[#FAFAFA] p-2 text-left shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]"
            onClick={() => onToggleSelect(item.id)}
          >
            <div className="relative aspect-[1920/1325] w-full overflow-hidden rounded-[4px]">
              <img
                src={item.image}
                alt=""
                className="h-full w-full rounded-[4px] object-cover"
              />
              {isSelected ? <div className="absolute inset-0 rounded-[4px] bg-black/50" /> : null}
            </div>
            <span className={`absolute left-[19px] top-[18px] flex h-5 w-5 items-center justify-center rounded-full p-[2px] ${
              isSelected ? "bg-[#FAFAFA]" : "bg-[#E5E5E5]"
            }`}>
              {isSelected ? <CheckIcon /> : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}
