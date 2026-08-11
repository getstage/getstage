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
  css = null,
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
  missingScreens = [],
  onGenerateMissing,
  deleteMode = false,
  selectedDeleteIds,
  onStartDelete,
  onCancelDelete,
  onToggleDeleteSelection,
  onConfirmDelete,
  onSelectAllDelete,
  isDeleting = false,
  // Optional slot rendered above the grid during regenerate mode. The parent
  // owns the source picker + style-direction select so this grid stays a pure
  // presentation component; the confirm reads whatever state the parent wired
  // through onConfirmRegenerate.
  regeneratePicker = null,
}: {
  wireframeKind: WireframeKind;
  cards: WireframeResultCard[];
  // Shared run stylesheet for R2-offloaded runs; null when fragments embed CSS.
  css?: string | null;
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
  /** Selected screens that have no generated design yet — surfaced so a partial run
   *  (rate limit, parse/render failure, or a freshly added screen) is visible, not lost. */
  missingScreens?: { id: string; title: string }[];
  /** Scoped run for exactly the missing screens. */
  onGenerateMissing?: () => void;
  /** Per-screen delete selection, mirroring regenerate mode. */
  deleteMode?: boolean;
  selectedDeleteIds?: Set<string>;
  onStartDelete?: () => void;
  onCancelDelete?: () => void;
  onToggleDeleteSelection?: (cardId: string) => void;
  onConfirmDelete?: () => void;
  onSelectAllDelete?: () => void;
  isDeleting?: boolean;
  regeneratePicker?: ReactNode;
}) {
  const regenerateCount = selectedRegenerateIds.size;
  const deleteSelectedCount = selectedDeleteIds?.size ?? 0;
  const selectionMode = regenerateMode || deleteMode;
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
          {!selectionMode ? (
            <>
              <SecondaryButton onClick={onManageScreens} disabled={isGenerating}>
                <PlusIcon />
                Add or edit screens
              </SecondaryButton>
              {cards.length > 0 ? (
                <SecondaryButton onClick={onStartDelete} disabled={isGenerating}>
                  Delete screens
                </SecondaryButton>
              ) : null}
            </>
          ) : null}
          {deleteMode ? (
            <>
              {cards.length > 0 ? (
                <SecondaryButton onClick={onSelectAllDelete}>
                  {deleteSelectedCount === cards.length ? "Clear selection" : "Select all"}
                </SecondaryButton>
              ) : null}
              <SecondaryButton onClick={onCancelDelete}>Cancel</SecondaryButton>
              <button
                type="button"
                onClick={onConfirmDelete}
                disabled={deleteSelectedCount === 0 || isDeleting}
                className="inline-flex h-[38px] items-center justify-center gap-2 rounded-[6px] border border-[#F5A5A5] bg-gradient-to-b from-[#E5484D] to-[#C62A2F] px-3 text-[13px] font-medium leading-[1.25] text-[#FAFAFA] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
              >
                Delete {deleteSelectedCount > 0 ? deleteSelectedCount : ""} screen
                {deleteSelectedCount === 1 ? "" : "s"}
              </button>
            </>
          ) : null}
          {wireframeKind === "hifi" && !deleteMode ? (
            regenerateMode ? (
              <>
                <SecondaryButton onClick={onCancelRegenerate}>Cancel</SecondaryButton>
                <PrimaryButton
                  onClick={onConfirmRegenerate}
                  disabled={regenerateCount === 0 || isGenerating || regenerateConfirmBlocked}
                >
                  Regenerate {regenerateCount > 0 ? regenerateCount : ""} screen
                  {regenerateCount === 1 ? "" : "s"}
                  <ArrowRightIcon />
                </PrimaryButton>
              </>
            ) : (
              <SecondaryButton purple onClick={onStartRegenerate} disabled={isGenerating}>
                Regenerate
              </SecondaryButton>
            )
          ) : null}
          {wireframeKind === "lofi" && !selectionMode ? (
            <SecondaryButton purple onClick={onConvert} disabled={isGenerating}>
              Convert to High-fi
              <ArrowRightIcon />
            </SecondaryButton>
          ) : null}
        </div>
      </div>
      {!selectionMode && missingScreens.length > 0 ? (
        <div className="mx-1 mb-1 flex flex-wrap items-center justify-between gap-3 rounded-[8px] bg-[#FEF3C7] px-4 py-3 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
          <p className="text-[12px] font-medium leading-[1.5] text-[#92400E]">
            {missingScreens.length} selected{" "}
            {missingScreens.length === 1 ? "screen has" : "screens have"} no design yet:{" "}
            {missingScreens.map((screen) => screen.title).join(", ")}
          </p>
          {onGenerateMissing ? (
            <SecondaryButton purple onClick={onGenerateMissing} disabled={isGenerating}>
              Generate {missingScreens.length === 1 ? "it" : "missing"}
              <ArrowRightIcon />
            </SecondaryButton>
          ) : null}
        </div>
      ) : null}
      {regenerateMode && regeneratePicker ? (
        <div className="px-4 pb-4">{regeneratePicker}</div>
      ) : null}
      {cards.length === 0 ? (
        // The grid only lists screens present in both the screen list and the generated
        // set. An empty intersection used to render a blank panel with no explanation,
        // which reads as data loss even when every screen generated fine.
        <div className="flex min-h-[240px] flex-col items-center justify-center gap-2 rounded-[8px] bg-white p-8 text-center shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
          <p className="text-[15px] font-medium leading-[1.4] text-[#171717]">
            No screens to show yet
          </p>
          <p className="max-w-[380px] text-[13px] leading-[1.5] text-[#525252]">
            Add or edit screens to pick what to design, then run Regenerate.
          </p>
        </div>
      ) : (
        <div className="grid gap-1 lg:grid-cols-3">
          {cards.map((card, index) => (
            <WireframeCard
              key={`${card.id}-${index}`}
              card={card}
              css={css}
              view={effectiveView}
              onExport={() => onExport(card.id)}
              regenerateMode={selectionMode}
              isSelected={
                deleteMode
                  ? (selectedDeleteIds?.has(card.id) ?? false)
                  : selectedRegenerateIds.has(card.id)
              }
              isRegenerating={regeneratingSet.has(card.id)}
              onToggleRegenerate={() =>
                deleteMode
                  ? onToggleDeleteSelection?.(card.id)
                  : onToggleRegenerateSelection(card.id)
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function WireframeCard({
  card,
  css = null,
  view,
  onExport,
  regenerateMode = false,
  isSelected = false,
  isRegenerating = false,
  onToggleRegenerate,
}: {
  card: WireframeResultCard;
  css?: string | null;
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
    <WireframeHtmlThumbnail html={html} css={css} />
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
          css={css}
          liveUrl={card.liveUrl ?? null}
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
              {/* Only meaningful once a Hi-Fi design exists: it says whether this screen
                  was built from the selected component libraries or quietly fell back to
                  markup the model wrote by hand. */}
              {hasHtml && card.renderMode === "html-fallback" ? (
                <span title="This screen fell back to model-written HTML — the selected component libraries were not used.">
                  <Badge tone="rose">Fallback HTML</Badge>
                </span>
              ) : null}
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
