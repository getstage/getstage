import type { WireframeKind } from "@/types/project/wireframesTab";
import type { WireframeAssetCard } from "@/types/project/assetsTab";
import { ImagePlaceholderIcon, SparkleIcon } from "./assetsIcons";
import { WireframeBlockPreview } from "../wireframes/WireframeBlockPreview";
import { WireframeHtmlThumbnail } from "../wireframes/WireframeHtmlPreview";

export function AssetCard({
  asset,
  view,
  onExport,
}: {
  asset: WireframeAssetCard;
  view: WireframeKind;
  onExport: () => void;
}) {
  const html = asset.html?.trim();
  const showHtml = view === "hifi" && Boolean(html);
  const hasBlocks = asset.sections.some((section) => section.blocks.length > 0);

  return (
    <article className="flex h-[240px] flex-col overflow-hidden rounded-[8px] bg-white p-[2px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] sm:h-[336px]">
      <div
        className={`flex min-h-0 flex-1 items-stretch justify-center overflow-hidden rounded-[6px] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] ${
          showHtml && html ? "bg-white p-0" : "bg-[#E5E5E5] p-2"
        }`}
      >
        {showHtml && html ? (
          <WireframeHtmlThumbnail html={html} css={asset.css ?? null} />
        ) : hasBlocks ? (
          <WireframeBlockPreview sections={asset.sections} />
        ) : (
          <ImagePlaceholderIcon />
        )}
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-[6px]">
            <div className="flex min-w-0 items-center gap-2">
              <h3 className="truncate text-[15px] font-medium leading-[1.25] text-[#171717]">
                {asset.title}
              </h3>
              <span className="shrink-0 rounded-[2px] bg-[#F3E8FF] px-1 py-[2px] text-[12px] font-normal leading-[1.25] text-[#3B0764]">
                {asset.priority}
              </span>
            </div>
            <div className="mt-[6px] flex items-center gap-2 text-[12px] font-medium leading-[1.5] text-[#737373]">
              <SparkleIcon />
              <span>{asset.source}</span>
            </div>
            <p className="mt-[2px] text-[12px] font-medium leading-[1.5] text-[#737373]">
              {asset.date}
            </p>
          </div>

          <button
            type="button"
            onClick={onExport}
            className="inline-flex h-[27px] shrink-0 cursor-pointer items-center justify-center rounded-[4px] border border-[#D4D4D4] bg-[#F5F5F5] px-3 text-[12px] font-medium leading-[1.25] text-[#171717] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#ECECEC]"
          >
            Export
          </button>
        </div>
      </div>
    </article>
  );
}
