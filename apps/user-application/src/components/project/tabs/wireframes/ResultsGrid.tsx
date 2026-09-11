import { useEffect, useState } from "react";
import type { WireframeResultCard } from "@/lib/project/mapWireframesArtifactToTabData";
import { formatRelativeTime } from "@/lib/utils";
import { Badge, SecondaryButton } from "./WireframePrimitives";
import { CheckIcon, ImageIcon, PlusIcon, SparkleIcon } from "./wireframesIcons";
import { WireframeBlockPreview } from "./WireframeBlockPreview";

export function ResultsGrid({
  cards,
  onExport,
  onManageScreens,
  deleteMode = false,
  selectedDeleteIds = new Set<string>(),
  onStartDelete,
  onCancelDelete,
  onToggleDeleteSelection,
  onConfirmDelete,
  isDeleting = false,
}: {
  cards: WireframeResultCard[];
  onExport: (cardId: string) => void;
  onManageScreens: () => void;
  deleteMode?: boolean;
  selectedDeleteIds?: Set<string>;
  onStartDelete: () => void;
  onCancelDelete: () => void;
  onToggleDeleteSelection: (cardId: string) => void;
  onConfirmDelete: () => void;
  isDeleting?: boolean;
}) {
  const selectedCount = selectedDeleteIds.size;

  return (
    <div className="rounded-[12px] bg-[#F5F5F5] p-1 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
      <div className="flex items-center justify-between gap-4 p-4">
        <h2 className="text-[15px] font-medium leading-[1.25] text-[#171717]">
          Lo-Fi Wireframes
        </h2>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {!deleteMode ? (
            <>
              <SecondaryButton onClick={onManageScreens}>
                <PlusIcon />
                Add or edit screens
              </SecondaryButton>
              {cards.length > 0 ? (
                <SecondaryButton onClick={onStartDelete}>Delete screens</SecondaryButton>
              ) : null}
            </>
          ) : (
            <>
              <SecondaryButton onClick={onCancelDelete}>Cancel</SecondaryButton>
              <button
                type="button"
                onClick={onConfirmDelete}
                disabled={selectedCount === 0 || isDeleting}
                className="inline-flex h-[38px] items-center justify-center rounded-[6px] border border-[#F5A5A5] bg-[#C62A2F] px-3 text-[13px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Delete {selectedCount > 0 ? selectedCount : ""} screen
                {selectedCount === 1 ? "" : "s"}
              </button>
            </>
          )}
        </div>
      </div>
      <div className="grid gap-1 lg:grid-cols-3">
        {cards.map((card, index) => (
          <WireframeCard
            key={`${card.id}-${index}`}
            card={card}
            onExport={() => onExport(card.id)}
            selecting={deleteMode}
            selected={selectedDeleteIds.has(card.id)}
            onToggleSelection={() => onToggleDeleteSelection(card.id)}
          />
        ))}
      </div>
    </div>
  );
}

export function WireframeCard({
  card,
  onExport,
  selecting = false,
  selected = false,
  onToggleSelection,
}: {
  card: WireframeResultCard;
  onExport: () => void;
  selecting?: boolean;
  selected?: boolean;
  onToggleSelection?: () => void;
}) {
  const [, setRelativeTimeTick] = useState(0);
  const sections = card.sections ?? [];
  const preview = sections.some((section) => section.blocks.length > 0)
    ? <WireframeBlockPreview sections={sections} />
    : <ImageIcon />;
  const generatedAtLabel = card.generatedAt
    ? formatRelativeTime(card.generatedAt)
    : card.date;

  useEffect(() => {
    if (!card.generatedAt) return;
    const intervalId = window.setInterval(() => {
      setRelativeTimeTick((tick) => tick + 1);
    }, 30_000);
    return () => window.clearInterval(intervalId);
  }, [card.generatedAt]);

  return (
    <article className="flex h-[336px] flex-col rounded-[8px] bg-white p-[2px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
      {selecting ? (
        <button
          type="button"
          onClick={onToggleSelection}
          className={`relative flex min-h-0 flex-1 cursor-pointer items-stretch justify-center overflow-hidden rounded-[6px] p-2 shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] ${
            selected ? "bg-[#E7E6FD] ring-2 ring-[#7B76DF]" : "bg-[#E5E5E5]"
          }`}
        >
          <span
            className={`absolute left-3 top-3 z-10 flex h-4 w-4 items-center justify-center rounded-[4px] ${
              selected ? "bg-[#0A0A0A] text-white" : "bg-white text-transparent"
            }`}
          >
            <CheckIcon />
          </span>
          <span className="flex min-h-0 flex-1 items-start justify-center overflow-hidden rounded-[4px] bg-[#E5E5E5] p-2">
            {preview}
          </span>
        </button>
      ) : (
        <div className="flex min-h-0 flex-1 items-start justify-center overflow-hidden rounded-[6px] bg-[#E5E5E5] p-2 shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
          {preview}
        </div>
      )}
      <div className="shrink-0 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <h3 className="truncate text-[15px] font-medium leading-[1.1] text-[#171717]">
                {card.title} Wireframe
              </h3>
              <Badge tone="purple">{card.priority}</Badge>
            </div>
            <div className="mt-[7px] flex items-center gap-2 text-[12px] font-medium leading-[1.5] text-[#737373]">
              <SparkleIcon />
              AI Generated
            </div>
            <p className="mt-[3px] text-[12px] font-medium leading-[1.5] text-[#737373]">
              {generatedAtLabel}
            </p>
          </div>
          {!selecting ? (
            <button
              type="button"
              onClick={onExport}
              className="inline-flex h-8 shrink-0 cursor-pointer items-center justify-center whitespace-nowrap rounded-[6px] border border-[#D4D4D4] bg-[#F5F5F5] px-3 text-[13px] font-medium leading-none text-[#171717] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#EDEDED]"
            >
              Export
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
