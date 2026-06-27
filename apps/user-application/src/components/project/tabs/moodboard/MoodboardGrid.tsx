import { useEffect, useMemo, useState } from "react";
import type { MoodboardItem } from "@/data/fixtures/project/moodboardTabFixtures";
import { PhotoLightbox } from "@/components/project/PhotoLightbox";
import { CheckIcon } from "./moodboardIcons";

function isRenderableImageSrc(value: string | null | undefined) {
  return Boolean(value && /^(https?:|data:|blob:)/i.test(value));
}

function uniqueSources(item: MoodboardItem, preferFull: boolean) {
  const sources = preferFull
    ? [item.imageUrl, item.thumbnailUrl, item.image, item.sourceUrl]
    : [item.thumbnailUrl, item.image, item.imageUrl, item.sourceUrl];

  return sources
    .filter(isRenderableImageSrc)
    .filter((src, index, values) => values.indexOf(src) === index);
}

export function MoodboardGrid({
  items,
  selectedIds,
  onToggleSelect,
}: {
  items: MoodboardItem[];
  selectedIds: Set<string>;
  onToggleSelect: (itemId: string) => void;
}) {
  const [previewItem, setPreviewItem] = useState<MoodboardItem | null>(null);

  return (
    <>
      <div className="grid w-full grid-cols-1 gap-1 md:grid-cols-3">
        {items.map((item) => {
          const isSelected = selectedIds.has(item.id);
          return (
            <article
              key={item.id}
              className="group relative min-w-0 rounded-[8px] bg-[#FAFAFA] p-2 text-left shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]"
            >
              <button
                type="button"
                className="relative block aspect-[1920/1325] w-full cursor-pointer overflow-hidden rounded-[4px] text-left"
                onClick={() => onToggleSelect(item.id)}
                aria-label={isSelected ? "Deselect moodboard reference" : "Select moodboard reference"}
              >
                <MoodboardGridImage item={item} />
                {isSelected ? <div className="absolute inset-0 rounded-[4px] bg-black/50" /> : null}
                {!item.isInMoodboard ? (
                  <span className="pointer-events-none absolute bottom-2 left-2 rounded-[4px] bg-[#7B76DF] px-[6px] py-[2px] text-[10px] font-semibold leading-none text-white shadow-[0_0.45px_1px_rgba(10,10,10,0.35)]">
                    New
                  </span>
                ) : null}
              </button>
              <span className={`pointer-events-none absolute left-[19px] top-[18px] flex h-5 w-5 items-center justify-center rounded-full p-[2px] ${
                isSelected ? "bg-[#FAFAFA]" : "bg-[#E5E5E5]"
              }`}>
                {isSelected ? <CheckIcon /> : null}
              </span>
              <button
                type="button"
                className="absolute right-[18px] top-[18px] flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-[#171717] opacity-0 shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] transition-opacity hover:bg-white focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-[#6D5DD3] group-hover:opacity-100"
                onClick={() => setPreviewItem(item)}
                aria-label="Open fullscreen preview"
                title="Open fullscreen preview"
              >
                <FullscreenIcon />
              </button>
            </article>
          );
        })}
      </div>
      {previewItem ? (
        <MoodboardItemLightbox item={previewItem} onClose={() => setPreviewItem(null)} />
      ) : null}
    </>
  );
}

function MoodboardItemLightbox({
  item,
  onClose,
}: {
  item: MoodboardItem;
  onClose: () => void;
}) {
  const src = uniqueSources(item, true)[0];
  if (!src) {
    return null;
  }

  return (
    <PhotoLightbox
      src={src}
      label={item.title ?? "Reference preview"}
      originalSrc={item.sourceUrl ?? undefined}
      onClose={onClose}
    />
  );
}

function MoodboardGridImage({ item }: { item: MoodboardItem }) {
  const sources = useMemo(() => uniqueSources(item, false), [item]);
  const [sourceIndex, setSourceIndex] = useState(0);

  useEffect(() => {
    setSourceIndex(0);
  }, [item.id, item.image, item.thumbnailUrl, item.imageUrl]);

  const src = sources[sourceIndex];

  if (!src) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-[4px] bg-[#F5F5F5] px-4 text-center text-[12px] font-medium leading-[1.4] text-[#737373]">
        Image unavailable
      </div>
    );
  }

  return (
    <img
      src={src}
      alt=""
      className="h-full w-full rounded-[4px] object-cover"
      onError={() => {
        setSourceIndex((current) => current + 1);
      }}
    />
  );
}

function FullscreenIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-4 w-4">
      <path d="M5.8 3H3v2.8M10.2 3H13v2.8M13 10.2V13h-2.8M3 10.2V13h2.8" />
    </svg>
  );
}

