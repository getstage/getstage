import { useState } from "react";
import type { UiPatternGroupWithPatterns } from "@/types/project/researchTab";
import {
  ArrowLeftMiniIcon,
  ArrowRightMiniIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  PatternIcon,
  RegenerateIcon,
} from "./researchIcons";

type UiPatternsProps = {
  groups: UiPatternGroupWithPatterns[];
  isEditing: boolean;
  openGroupId: string | null;
  onToggleGroup: (groupId: string) => void;
  onOpenPhoto: (src: string) => void;
  onRegenerate?: () => void;
};

export function UiPatterns({
  groups,
  isEditing,
  openGroupId,
  onToggleGroup,
  onOpenPhoto,
  onRegenerate,
}: UiPatternsProps) {
  const [carouselIndexes, setCarouselIndexes] = useState<Record<string, number>>({});

  const updateCarouselIndex = (groupId: string, imageCount: number, direction: -1 | 1) => {
    if (imageCount <= 1) {
      return;
    }

    setCarouselIndexes((current) => {
      const currentIndex = current[groupId] ?? 0;
      const nextIndex = (currentIndex + direction + imageCount) % imageCount;
      return { ...current, [groupId]: nextIndex };
    });
  };

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-end">
        <div className="flex items-center gap-3">
          <h2 className="text-[15px] font-medium leading-[1.25] text-[#171717]">UI Patterns</h2>
          <div className="h-1 w-1 rounded-full bg-[#A3A3A3]" />
          <div className="flex items-center gap-2">
            <img src="/logos/refero.svg" alt="" className="h-4 w-4" />
            <p className="text-[12px] font-medium leading-[1.25] text-[#525252]">Analysed with Refero</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {groups.map((group) => (
          <UiPatternGroup
            key={group.id}
            group={group}
            isEditing={isEditing}
            isOpen={openGroupId === group.id}
            carouselIndex={carouselIndexes[group.id] ?? 0}
            onPrevious={() => updateCarouselIndex(group.id, group.images.length, -1)}
            onNext={() => updateCarouselIndex(group.id, group.images.length, 1)}
            onToggle={() => onToggleGroup(group.id)}
            onOpenPhoto={onOpenPhoto}
            onRegenerate={onRegenerate}
          />
        ))}
      </div>
    </section>
  );
}

function UiPatternGroup({
  group,
  isEditing,
  isOpen,
  carouselIndex,
  onPrevious,
  onNext,
  onToggle,
  onOpenPhoto,
  onRegenerate,
}: {
  group: UiPatternGroupWithPatterns;
  isEditing: boolean;
  isOpen: boolean;
  carouselIndex: number;
  onPrevious: () => void;
  onNext: () => void;
  onToggle: () => void;
  onOpenPhoto: (src: string) => void;
  onRegenerate?: () => void;
}) {
  const canCycleImages = group.images.length > 1;
  const visibleImages = getVisibleCarouselImages(group.images, carouselIndex, 3);

  return (
    <article className="rounded-[10px] bg-[#FAFAFA] p-1 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
      <div className="flex items-center justify-between p-3">
        <h3 className="text-[13px] font-medium leading-[1.25] text-[#171717]">{group.title}</h3>
        <div className="flex h-[22px] items-start gap-[2px] rounded-[6px] bg-[#F4F4F5] p-[2px]">
          <button
            type="button"
            onClick={onPrevious}
            disabled={!canCycleImages}
            className="flex h-[18px] w-[30px] shrink-0 items-center justify-center rounded-[4px] text-[#737373] shadow-[0_0.5px_0.5px_rgba(0,0,0,0.07)] transition-colors hover:bg-white hover:text-[#0A0A0A] disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={`Previous ${group.title} patterns`}
          >
            <ArrowLeftMiniIcon />
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={!canCycleImages}
            className="flex h-[18px] w-[30px] shrink-0 items-center justify-center rounded-[4px] bg-white text-[#0A0A0A] shadow-[0_0.5px_0.5px_rgba(0,0,0,0.07)] transition-colors hover:bg-[#FAFAFA] disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={`Next ${group.title} patterns`}
          >
            <ArrowRightMiniIcon />
          </button>
        </div>
      </div>

      {visibleImages.length > 0 ? (
        <div className="grid grid-cols-1 gap-1 md:grid-cols-3">
          {visibleImages.map(({ src, originalIndex }) => (
            <button
              key={`${group.id}-${src}-${originalIndex}`}
              type="button"
              onClick={() => onOpenPhoto(src)}
              className="group rounded-[8px] bg-white p-2 text-left shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-transform hover:-translate-y-px"
              aria-label={`Open ${group.title} reference ${originalIndex + 1}`}
            >
              <div className="aspect-[1920/1325] overflow-hidden rounded-[4px]">
                <img src={src} alt="" className="h-full w-full object-cover transition-transform group-hover:scale-[1.01]" />
              </div>
            </button>
          ))}
        </div>
      ) : null}

      <div className="mt-1 overflow-hidden rounded-[8px] bg-white p-4 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
        <button
          type="button"
          onClick={onToggle}
          className="flex w-full items-center justify-between text-left"
          aria-expanded={isOpen}
        >
          <span className="text-[13px] font-semibold leading-[1.25] text-[#171717]">Patterns Recognised</span>
          {isOpen ? <ChevronUpIcon /> : <ChevronDownIcon />}
        </button>

        {isOpen ? (
          <div className="mt-4 flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-2 xl:grid-cols-2">
              {group.recognizedPatterns.map(([title, body]) => (
                <PatternCard key={title} title={title} body={body} isEditing={isEditing} />
              ))}
            </div>

            {isEditing ? (
              <button
                type="button"
                onClick={onRegenerate}
                className="inline-flex h-[27px] w-fit cursor-pointer items-center gap-2 rounded-[4px] bg-white px-3 py-[6px] text-[12px] font-medium leading-[1.25] text-[#7C3AED] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#F5F3FF]"
              >
                <RegenerateIcon />
                Regenerate with AI
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}

function getVisibleCarouselImages(images: string[], startIndex: number, visibleCount: number) {
  if (images.length <= 1) {
    return images.map((src, originalIndex) => ({ src, originalIndex }));
  }

  const count = Math.min(images.length, visibleCount);

  return Array.from({ length: count }, (_, index) => {
    const originalIndex = (startIndex + index) % images.length;
    return { src: images[originalIndex], originalIndex };
  });
}

function PatternCard({ title, body, isEditing }: { title: string; body: string; isEditing: boolean }) {
  return (
    <article className="rounded-[8px] bg-[#FAFAFA] p-[2px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
      <div className="flex min-h-[70px] gap-3 rounded-[6px] p-4">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[4px] bg-[#E7E6FD] p-1 text-[#16115A]">
          <PatternIcon />
        </div>
        {isEditing ? (
          <div className="grid min-w-0 flex-1 gap-[6px]">
            <input defaultValue={title} aria-label={`${title} title`} className="h-[25px] rounded-[5px] bg-[#F5F5F5] px-2 text-[13px] font-semibold leading-[1.25] text-[#171717]" />
            <textarea defaultValue={body} aria-label={`${title} body`} className="min-h-[54px] resize-y rounded-[6px] bg-[#F5F5F5] px-2 py-[7px] text-[12px] font-medium leading-[1.5] text-[#737373]" />
          </div>
        ) : (
          <div className="min-w-0">
            <h3 className="text-[13px] font-medium leading-none text-[#171717]">{title}</h3>
            {body ? <p className="mt-1 text-[12px] font-normal leading-[1.5] text-[#525252]">{body}</p> : null}
          </div>
        )}
      </div>
    </article>
  );
}
