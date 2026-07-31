import { useEffect, useState, type ReactNode } from "react";
import type { WireframeResultCard } from "@/lib/project/mapWireframesArtifactToTabData";
import { formatRelativeTime } from "@/lib/utils";
import type { WireframeKind } from "@/types/project/wireframesTab";
import { Badge, PrimaryButton, SecondaryButton } from "./WireframePrimitives";
import { FidelityToggle } from "./FidelityToggle";
import { ArrowRightIcon, CheckIcon, ImageIcon, PlusIcon, SparkleIcon } from "./wireframesIcons";
import { WireframeBlockPreview } from "./WireframeBlockPreview";
import {
  WireframeHtmlPreviewDialog,
  WireframeHtmlThumbnail,
} from "./WireframeHtmlPreview";

export function ResultsGrid({
  wireframeKind,
  cards,
  onConvert,
  onExport,
  isGenerating = false,
  regenerateMode = false,
  selectedRegenerateIds,
  regeneratingScreenIds,
  onStartRegenerate,
  onCancelRegenerate,
  onToggleRegenerateSelection,
  onConfirmRegenerate,
  onManageScreens,
  regenerateConfirmBlocked = false,
  // Optional slot rendered above the grid during regenerate mode. The parent
  // owns the source picker + style-direction select so this grid stays a pure
  // presentation component; the confirm reads whatever state the parent wired
  // through onConfirmRegenerate.
  regeneratePicker = null,
}: {
  wireframeKind: WireframeKind;
  cards: WireframeResultCard[];
  onConvert: () => void;
  onExport: (cardId: string) => void;
  isGenerating?: boolean;
  regenerateMode?: boolean;
  selectedRegenerateIds: Set<string>;
  regeneratingScreenIds?: string[] | null;
  onStartRegenerate: () => void;
  onCancelRegenerate: () => void;
  onToggleRegenerateSelection: (cardId: string) => void;
  onConfirmRegenerate: () => void;
  /** Back to the screen list, where screens can be added, edited or removed. */
  onManageScreens: () => void;
  regenerateConfirmBlocked?: boolean;
  regeneratePicker?: ReactNode;
}) {
  const selectedCount = selectedRegenerateIds.size;
  const regeneratingSet = new Set(regeneratingScreenIds ?? []);
  // A Hi-Fi artifact keeps each screen's Lo-Fi blocks alongside its rendered
  // design, so the user can flip the whole grid back to the Lo-Fi view after
  // converting. Lo-Fi-only artifacts have nothing to toggle to.
  const canToggleFidelity = wireframeKind === "hifi" && cards.some((card) => card.html?.trim());
  const [view, setView] = useState<WireframeKind>(wireframeKind);
  const effectiveView = canToggleFidelity ? view : wireframeKind;

  return (
    <div className="rounded-[12px] bg-[#F5F5F5] p-1 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
      <div className="flex items-center justify-between gap-4 p-4">
        {canToggleFidelity ? (
          <FidelityToggle value={effectiveView} onChange={setView} />
        ) : (
          <h2 className="text-[15px] font-medium leading-[1.25] text-[#171717]">
            {wireframeKind === "hifi" ? "Hi-Fi Wireframes" : "Lo-Fi Wireframes"}
          </h2>
        )}
        <div className="flex flex-wrap items-center justify-end gap-2">
          {!regenerateMode ? (
            <SecondaryButton onClick={onManageScreens} disabled={isGenerating}>
              <PlusIcon />
              Add or edit screens
            </SecondaryButton>
          ) : null}
          {wireframeKind === "hifi" ? (
            regenerateMode ? (
              <>
                <SecondaryButton onClick={onCancelRegenerate}>Cancel</SecondaryButton>
                <PrimaryButton
                  onClick={onConfirmRegenerate}
                  disabled={selectedCount === 0 || isGenerating || regenerateConfirmBlocked}
                >
                  Regenerate {selectedCount > 0 ? selectedCount : ""} screen
                  {selectedCount === 1 ? "" : "s"}
                  <ArrowRightIcon />
                </PrimaryButton>
              </>
            ) : (
              <SecondaryButton purple onClick={onStartRegenerate} disabled={isGenerating}>
                Regenerate
              </SecondaryButton>
            )
          ) : null}
          {wireframeKind === "lofi" ? (
            <SecondaryButton purple onClick={onConvert} disabled={isGenerating}>
              Convert to High-fi
              <ArrowRightIcon />
            </SecondaryButton>
          ) : null}
        </div>
      </div>
      {regenerateMode && regeneratePicker ? (
        <div className="px-4 pb-4">{regeneratePicker}</div>
      ) : null}
      <div className="grid gap-1 lg:grid-cols-3">
        {cards.map((card, index) => (
          <WireframeCard
            key={`${card.id}-${index}`}
            card={card}
            view={effectiveView}
            onExport={() => onExport(card.id)}
            regenerateMode={regenerateMode}
            isSelected={selectedRegenerateIds.has(card.id)}
            isRegenerating={regeneratingSet.has(card.id)}
            onToggleRegenerate={() => onToggleRegenerateSelection(card.id)}
          />
        ))}
      </div>
    </div>
  );
}

export function WireframeCard({
  card,
  view,
  onExport,
  regenerateMode = false,
  isSelected = false,
  isRegenerating = false,
  onToggleRegenerate,
}: {
  card: WireframeResultCard;
  view: WireframeKind;
  onExport: () => void;
  regenerateMode?: boolean;
  isSelected?: boolean;
  isRegenerating?: boolean;
  onToggleRegenerate?: () => void;
}) {
  const [, setRelativeTimeTick] = useState(0);
  const [previewOpen, setPreviewOpen] = useState(false);
  const sections = card.sections ?? [];
  const hasBlocks = sections.some((section) => section.blocks.length > 0);
  const html = card.html?.trim();
  // The Lo-Fi view renders the block outline even when a Hi-Fi design exists,
  // so converting to Hi-Fi never hides the Lo-Fi version the user can still check.
  const hasHtml = view === "hifi" && Boolean(html);
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

  const preview = hasHtml && html ? (
    <WireframeHtmlThumbnail html={html} />
  ) : hasBlocks ? (
    <WireframeBlockPreview sections={sections} />
  ) : (
    <ImageIcon />
  );

  return (
    <article
      className={`flex h-[336px] flex-col rounded-[8px] bg-white p-[2px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] ${
        isRegenerating ? "opacity-70" : ""
      }`}
    >
      {regenerateMode ? (
        <button
          type="button"
          onClick={onToggleRegenerate}
          className={`relative flex min-h-0 flex-1 cursor-pointer items-stretch justify-center overflow-hidden rounded-[6px] p-2 shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] ${
            isSelected ? "bg-[#E7E6FD] ring-2 ring-[#7B76DF]" : "bg-[#E5E5E5]"
          }`}
        >
          <span
            className={`absolute left-3 top-3 z-10 flex h-4 w-4 items-center justify-center rounded-[4px] ${
              isSelected ? "bg-[#0A0A0A] text-white" : "bg-white text-transparent"
            }`}
          >
            <CheckIcon />
          </span>
          <div className="flex min-h-0 flex-1 items-start justify-center overflow-hidden rounded-[4px] bg-[#E5E5E5] p-2">
            {preview}
          </div>
        </button>
      ) : hasHtml && html ? (
        <button
          type="button"
          onClick={() => setPreviewOpen(true)}
          title="Open full preview"
          className="flex min-h-0 flex-1 cursor-pointer items-stretch justify-stretch overflow-hidden rounded-[6px] bg-white p-0 shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] transition-shadow hover:shadow-[0_0.45px_2px_rgba(10,10,10,0.35)]"
        >
          {preview}
        </button>
      ) : (
        <div className="flex min-h-0 flex-1 items-start justify-center overflow-hidden rounded-[6px] bg-[#E5E5E5] p-2 shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
          {preview}
        </div>
      )}
      {hasHtml && html && !regenerateMode ? (
        <WireframeHtmlPreviewDialog
          html={html}
          title={`${card.title} Wireframe`}
          open={previewOpen}
          onOpenChange={setPreviewOpen}
        />
      ) : null}
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
              {isRegenerating ? "Regenerating..." : "AI Generated"}
            </div>
            <p className="mt-[3px] text-[12px] font-medium leading-[1.5] text-[#737373]">
              {generatedAtLabel}
            </p>
          </div>
          {!regenerateMode ? (
            <button
              type="button"
              onClick={onExport}
              disabled={isRegenerating}
              className="inline-flex h-8 shrink-0 cursor-pointer items-center justify-center whitespace-nowrap rounded-[6px] border border-[#D4D4D4] bg-[#F5F5F5] px-3 text-[13px] font-medium leading-none text-[#171717] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#EDEDED] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Export
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
