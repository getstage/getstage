import { useEffect, useMemo, useState } from "react";
import type { MoodboardItem } from "@/data/fixtures/project/moodboardTabFixtures";
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
        <MoodboardImagePreview item={previewItem} onClose={() => setPreviewItem(null)} />
      ) : null}
    </>
  );
}

function MoodboardGridImage({
  item,
  fit = "cover",
  preferFull = false,
}: {
  item: MoodboardItem;
  fit?: "cover" | "contain";
  preferFull?: boolean;
}) {
  const sources = useMemo(() => uniqueSources(item, preferFull), [item, preferFull]);
  const [sourceIndex, setSourceIndex] = useState(0);

  useEffect(() => {
    setSourceIndex(0);
  }, [item.id, item.image, item.thumbnailUrl, item.imageUrl, preferFull]);

  const src = sources[sourceIndex];

  if (!src) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-[4px] bg-[#F5F5F5] px-4 text-center text-[12px] font-medium leading-[1.4] text-[#737373]">
        Image unavailable
      </div>
    );
  }

  const className = preferFull
    ? "max-h-[min(640px,calc(100vh-160px))] max-w-[min(960px,calc(100vw-64px))] w-auto h-auto rounded-[4px] object-contain"
    : `h-full w-full rounded-[4px] ${fit === "contain" ? "object-contain" : "object-cover"}`;

  return (
    <img
      src={src}
      alt=""
      className={className}
      onError={() => {
        setSourceIndex((current) => current + 1);
      }}
    />
  );
}

function MoodboardImagePreview({
  item,
  onClose,
}: {
  item: MoodboardItem;
  onClose: () => void;
}) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
      role="dialog"
      aria-modal="true"
      aria-label={item.title ? `${item.title} fullscreen preview` : "Moodboard fullscreen preview"}
      onMouseDown={onClose}
    >
      <div
        className="relative flex max-h-[92vh] w-full max-w-[min(980px,94vw)] flex-col gap-3 rounded-[8px] bg-[#0A0A0A] p-3 shadow-[0_16px_60px_rgba(0,0,0,0.32)]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 truncate text-[13px] font-medium leading-[1.25] text-[#FAFAFA]">
            {item.title ?? "Moodboard reference"}
          </div>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-[#FAFAFA] transition-colors hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/60"
            onClick={onClose}
            aria-label="Close fullscreen preview"
          >
            <CloseIcon />
          </button>
        </div>
        <div className="flex w-full items-center justify-center overflow-hidden rounded-[6px] bg-[#171717] p-2">
          <MoodboardGridImage item={item} fit="contain" preferFull />
        </div>
      </div>
    </div>
  );
}

function FullscreenIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-4 w-4">
      <path d="M5.8 3H3v2.8M10.2 3H13v2.8M13 10.2V13h-2.8M3 10.2V13h2.8" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true" className="h-4 w-4">
      <path d="M4.5 4.5 11.5 11.5M11.5 4.5 4.5 11.5" />
    </svg>
  );
}
