import type {
  WireframeBlockEmphasis,
  WireframeRenderableBlock,
  WireframeRenderableSection,
} from "@/types/project/wireframesTab";

export function WireframeBlockPreview({
  sections,
}: {
  sections: WireframeRenderableSection[];
}) {
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
