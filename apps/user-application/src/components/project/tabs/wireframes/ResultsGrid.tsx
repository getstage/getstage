import { FIGMA_SYMBOL_URL } from "@/data/fixtures/project/wireframesTabFixtures";
import type { WireframeResultCard } from "@/lib/project/mapWireframesArtifactToTabData";
import type {
  WireframeBlockEmphasis,
  WireframeKind,
  WireframeRenderableBlock,
  WireframeRenderableSection,
} from "@/types/project/wireframesTab";
import { Badge, SecondaryButton } from "./WireframePrimitives";
import { ArrowRightIcon, ImageIcon, SparkleIcon } from "./wireframesIcons";

export function ResultsGrid({
  wireframeKind,
  cards,
  onConvert,
}: {
  wireframeKind: WireframeKind;
  cards: WireframeResultCard[];
  onConvert: () => void;
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
          <WireframeCard key={`${card.id}-${index}`} card={card} />
        ))}
      </div>
    </div>
  );
}

export function WireframeCard({ card }: { card: WireframeResultCard }) {
  const sections = card.sections ?? [];
  const hasBlocks = sections.some((section) => section.blocks.length > 0);

  return (
    <article className="flex h-[336px] flex-col rounded-[8px] bg-white p-[2px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
      <div className="flex min-h-0 flex-1 items-center justify-center rounded-[6px] bg-[#E5E5E5] p-2 shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
        {hasBlocks ? <BlockPreview sections={sections} /> : <ImageIcon />}
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
              {card.date}
            </p>
          </div>
          {card.figmaUrl ? (
            <a
              href={card.figmaUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-[27px] w-[125px] shrink-0 items-center justify-center gap-2 rounded-[4px] bg-[#F5F5F5] px-3 py-[6px] text-[12px] font-medium leading-[1.25] text-[#171717] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#EDEDED]"
            >
              <img
                src={FIGMA_SYMBOL_URL}
                alt=""
                className="h-[15px] w-[10px] shrink-0"
                draggable={false}
              />
              Open in Figma
            </a>
          ) : (
            <button
              type="button"
              disabled
              className="inline-flex min-h-[27px] w-[125px] shrink-0 cursor-not-allowed items-center justify-center gap-2 rounded-[4px] bg-[#F5F5F5] px-3 py-[6px] text-[12px] font-medium leading-[1.25] text-[#A3A3A3] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]"
            >
              <img
                src={FIGMA_SYMBOL_URL}
                alt=""
                className="h-[15px] w-[10px] shrink-0 opacity-60"
                draggable={false}
              />
              Open in Figma
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function BlockPreview({ sections }: { sections: WireframeRenderableSection[] }) {
  return (
    <div className="flex h-full w-full flex-col gap-1 overflow-hidden">
      {sections.map((section) => (
        <div key={section.id} className="flex flex-col gap-[2px]">
          {section.blocks.map((block) => (
            <BlockTile key={block.id} block={block} />
          ))}
        </div>
      ))}
    </div>
  );
}

function BlockTile({ block }: { block: WireframeRenderableBlock }) {
  const headline = block.copySlots?.headline ?? block.intent;

  return (
    <div
      className={`flex items-center justify-between rounded-[3px] bg-white px-2 ${emphasisHeightClass(block.emphasis)} shadow-[0_0.45px_0.5px_rgba(10,10,10,0.15)]`}
      title={block.intent}
    >
      <span className="truncate text-[10px] font-medium leading-[1.1] text-[#404040]">
        {headline}
      </span>
      <span className="ml-2 shrink-0 text-[9px] uppercase tracking-wide text-[#A3A3A3]">
        {block.kind}
      </span>
    </div>
  );
}

function emphasisHeightClass(emphasis: WireframeBlockEmphasis): string {
  switch (emphasis) {
    case "primary":
      return "h-9";
    case "secondary":
      return "h-6";
    case "tertiary":
    default:
      return "h-4";
  }
}
