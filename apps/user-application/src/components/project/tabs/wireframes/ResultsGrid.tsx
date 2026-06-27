import { useEffect, useState } from "react";
import type { WireframeResultCard } from "@/lib/project/mapWireframesArtifactToTabData";
import { formatRelativeTime } from "@/lib/utils";
import type {
  WireframeKind,
} from "@/types/project/wireframesTab";
import { Badge, SecondaryButton } from "./WireframePrimitives";
import { ArrowRightIcon, ImageIcon, SparkleIcon } from "./wireframesIcons";
import { WireframeBlockPreview } from "./WireframeBlockPreview";

export function ResultsGrid({
  wireframeKind,
  cards,
  onConvert,
  onExport,
}: {
  wireframeKind: WireframeKind;
  cards: WireframeResultCard[];
  onConvert: () => void;
  onExport: (cardId: string) => void;
}) {
  const title = wireframeKind === "hifi" ? "Hi-Fi Wireframes" : "Lo-Fi Wireframes";

  return (
    <div className="rounded-[12px] bg-[#F5F5F5] p-1 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
      <div className="flex items-end justify-between gap-4 p-4">
        <h2 className="text-[15px] font-medium leading-[1.25] text-[#171717]">{title}</h2>
        {wireframeKind === "lofi" ? (
          <SecondaryButton purple onClick={onConvert}>
            Convert to High-fi
            <ArrowRightIcon />
          </SecondaryButton>
        ) : null}
      </div>
      <div className="grid gap-1 lg:grid-cols-3">
        {cards.map((card, index) => (
          <WireframeCard
            key={`${card.id}-${index}`}
            card={card}
            onExport={() => onExport(card.id)}
          />
        ))}
      </div>
    </div>
  );
}

export function WireframeCard({
  card,
  onExport,
}: {
  card: WireframeResultCard;
  onExport: () => void;
}) {
  const [, setRelativeTimeTick] = useState(0);
  const sections = card.sections ?? [];
  const hasBlocks = sections.some((section) => section.blocks.length > 0);
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
      <div className="flex min-h-0 flex-1 items-center justify-center rounded-[6px] bg-[#E5E5E5] p-2 shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
        {hasBlocks ? <WireframeBlockPreview sections={sections} /> : <ImageIcon />}
      </div>
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
          <button
            type="button"
            onClick={onExport}
            className="inline-flex h-8 shrink-0 cursor-pointer items-center justify-center whitespace-nowrap rounded-[6px] border border-[#D4D4D4] bg-[#F5F5F5] px-3 text-[13px] font-medium leading-none text-[#171717] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#EDEDED]"
          >
            Export
          </button>
        </div>
      </div>
    </article>
  );
}
