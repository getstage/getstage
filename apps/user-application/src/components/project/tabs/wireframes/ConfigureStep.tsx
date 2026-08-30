import { useState } from "react";
import type { ProviderId } from "@stage/data-ops/contracts";
import { AiRunSettings } from "@/components/project/AiRunSettings";
import type { ResearchProviderOption } from "@/hooks/project/research/useResearchProviderSelection";
import { EMPTY_SCREEN_DRAFT, type ScreenDraft } from "@/lib/project/wireframeScreenList";
import type { ScreenItem, WireframeKind } from "@/types/project/wireframesTab";
import { Badge, PrimaryButton, SecondaryButton } from "./WireframePrimitives";
import { WireframeRunSelection } from "./WireframeRunSelection";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  EditIcon,
  PlusIcon,
  TrashIcon,
} from "./wireframesIcons";

/** Where the pre-run screen list came from, so the header can say it honestly. */
export type ScreenListSource = "flows" | "saved";

export function ConfigureStep({
  wireframeKind,
  screens,
  screenListSource,
  selectedCount,
  generatedScreenIds,
  skillIds,
  componentPackIds,
  onSaveSkills,
  providerOptions,
  selectedProviderId,
  onSelectProvider,
  nebiusSelected,
  onSelectNebius,
  onBackToResults,
  onChangeType,
  onAddBrandKit,
  onToggle,
  onAddScreen,
  onEditScreen,
  onDeleteScreen,
  onGoToFlows,
  onGenerate,
  onGenerateScreens,
}: {
  wireframeKind: WireframeKind;
  screens: ScreenItem[];
  screenListSource: ScreenListSource;
  selectedCount: number;
  /** Screens that already exist in the artifact; the rest are new work. */
  generatedScreenIds: readonly string[];
  skillIds: readonly string[];
  componentPackIds: readonly string[];
  onSaveSkills: (input: { skillIds: string[]; componentPackIds: string[] }) => Promise<void>;
  providerOptions: ResearchProviderOption[];
  selectedProviderId: ProviderId | null;
  onSelectProvider: (providerId: ProviderId) => void;
  nebiusSelected?: boolean;
  onSelectNebius?: () => void;
  /** Return to the results grid. Present only once a run exists to go back to. */
  onBackToResults?: () => void;
  onChangeType: () => void;
  onAddBrandKit: () => void;
  onToggle: (id: string) => void;
  onAddScreen: (draft: ScreenDraft) => void;
  onEditScreen: (id: string, draft: ScreenDraft) => void;
  onDeleteScreen: (id: string) => void;
  onGoToFlows?: () => void;
  onGenerate: () => void;
  /** Scoped run for a subset of the ticked screens, without touching the ticks. */
  onGenerateScreens: (screenIds: string[]) => void;
}) {
  const [editingScreenId, setEditingScreenId] = useState<string | null>(null);
  const [addDraftOpen, setAddDraftOpen] = useState(false);
  const generatedIds = new Set(generatedScreenIds);
  // Ticked screens the artifact has never produced. Adding a screen to a finished
  // set is the common case, and regenerating the rest of the set with it is the
  // expensive mistake, so that run gets its own button.
  const newScreenIds = screens
    .filter((screen) => screen.selected && !generatedIds.has(screen.id))
    .map((screen) => screen.id);

  return (
    <div className="rounded-[12px] bg-[#F5F5F5] p-1 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
      <div className="flex flex-col gap-[10px] p-4">
        <div>
          <h2 className="text-[15px] font-medium leading-[1.25] text-[#0A0A0A]">
            Generate Wireframes
          </h2>
          <p className="mt-[10px] max-w-[354px] text-[12px] font-medium leading-[1.5] text-[#525252]">
            AI will produce low-fidelity block layouts for every screen. You&apos;ll take them into Figma for the High-fidelity design pass.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 text-[13px] font-medium leading-[1.25]">
            <span className="text-[#171717]">
              {screens.length}{" "}
              {screens.length === 1 ? "screen" : "screens"}{" "}
              {screenListSource === "flows" ? "from Flows" : "in this project's screen list"}
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3">
            {onBackToResults ? (
              <SecondaryButton purple onClick={onBackToResults}>
                <ArrowLeftIcon />
                Back to wireframes
              </SecondaryButton>
            ) : null}
            <SecondaryButton onClick={onChangeType}>
              <ArrowLeftIcon />
              Change Wireframe type
            </SecondaryButton>
            {wireframeKind === "lofi" ? (
              <SecondaryButton purple onClick={onAddBrandKit}>
                <PlusIcon />
                Add Brand Kit
              </SecondaryButton>
            ) : null}
          </div>
        </div>
      </div>

      {wireframeKind === "hifi" ? (
        <div className="mb-1">
          <WireframeRunSelection
            skillIds={skillIds}
            componentPackIds={componentPackIds}
            onSave={onSaveSkills}
          />
        </div>
      ) : null}

      <div className="rounded-[8px] bg-white p-11 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 text-[15px] font-medium leading-[1.25] text-[#171717]">
          <span>Screens To Generate</span>
          <div className="flex items-center gap-3">
            <span className="text-[13px] text-[#525252]">
              {selectedCount} of {screens.length} selected
            </span>
            <SecondaryButton
              purple
              onClick={() => {
                setEditingScreenId(null);
                setAddDraftOpen(true);
              }}
            >
              <PlusIcon />
              Add screen
            </SecondaryButton>
          </div>
        </div>
        {screens.length === 0 && !addDraftOpen ? (
          <EmptyScreenList onGoToFlows={onGoToFlows} />
        ) : null}
        <div className="flex flex-col gap-1">
          {screens.map((screen) =>
            editingScreenId === screen.id ? (
              <ScreenDraftRow
                key={screen.id}
                draft={{
                  title: screen.title,
                  description: screen.description,
                  kind: screen.kind,
                }}
                submitLabel="Save screen"
                onCancel={() => setEditingScreenId(null)}
                onSubmit={(draft) => {
                  onEditScreen(screen.id, draft);
                  setEditingScreenId(null);
                }}
              />
            ) : (
              <ScreenRow
                key={screen.id}
                screen={screen}
                isGenerated={generatedIds.has(screen.id)}
                onToggle={() => onToggle(screen.id)}
                onEdit={() => {
                  setAddDraftOpen(false);
                  setEditingScreenId(screen.id);
                }}
                onDelete={() => {
                  if (editingScreenId === screen.id) {
                    setEditingScreenId(null);
                  }
                  onDeleteScreen(screen.id);
                }}
              />
            ),
          )}
          {addDraftOpen ? (
            <ScreenDraftRow
              draft={EMPTY_SCREEN_DRAFT}
              submitLabel="Add screen"
              onCancel={() => setAddDraftOpen(false)}
              onSubmit={(draft) => {
                onAddScreen(draft);
                setAddDraftOpen(false);
              }}
            />
          ) : null}
        </div>
        <label className="mt-6 block">
          <span className="mb-2 flex gap-2 text-[13px] font-medium leading-[1.25]">
            <span className="text-[#171717]">Layout Preference</span>
            <span className="text-[#737373]">(Optional)</span>
          </span>
          <textarea
            className="h-[84px] w-full resize-none rounded-[6px] bg-[#F5F5F5] px-3 py-[10px] text-[12px] font-medium leading-[1.25] text-[#525252] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] outline-none transition-shadow placeholder:text-[#737373] focus:shadow-[0_0_0_1px_#8D87FF]"
            placeholder="ex. sticky header with primary CTA, wide hero, keep forms short, mobile-first density..."
          />
        </label>
        <div className="mt-6 border-t border-[#E5E5E5] pt-6">
          <AiRunSettings
            providerOptions={providerOptions}
            selectedProviderId={selectedProviderId}
            onSelectProvider={onSelectProvider}
            nebiusSelected={nebiusSelected}
            onSelectNebius={onSelectNebius}
          />
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
          {newScreenIds.length > 0 && newScreenIds.length < selectedCount ? (
            <SecondaryButton
              purple
              size="action"
              disabled={!nebiusSelected && !selectedProviderId}
              onClick={() => onGenerateScreens(newScreenIds)}
            >
              Generate {newScreenIds.length} new {newScreenIds.length === 1 ? "screen" : "screens"}{" "}
              only
              <ArrowRightIcon />
            </SecondaryButton>
          ) : null}
          <PrimaryButton onClick={onGenerate} disabled={(!nebiusSelected && !selectedProviderId) || selectedCount === 0}>
            Generate {selectedCount} {selectedCount === 1 ? "Wireframe" : "Wireframes"}
            <ArrowRightIcon />
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}

function EmptyScreenList({ onGoToFlows }: { onGoToFlows?: () => void }) {
  return (
    <div className="rounded-[8px] bg-[#FAFAFA] p-6 text-center shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
      <p className="text-[13px] font-medium leading-[1.25] text-[#171717]">
        No screens to generate yet
      </p>
      <p className="mx-auto mt-2 max-w-[420px] text-[12px] font-normal leading-[1.5] text-[#525252]">
        Wireframe screens come from this project&apos;s Flows. Run Flows first, or add the screens
        you need by hand.
      </p>
      {onGoToFlows ? (
        <div className="mt-4 flex justify-center">
          <SecondaryButton purple onClick={onGoToFlows}>
            Go to Flows
            <ArrowRightIcon />
          </SecondaryButton>
        </div>
      ) : null}
    </div>
  );
}

const DRAFT_FIELD_CLASSES =
  "w-full rounded-[6px] bg-[#F5F5F5] px-3 py-[10px] text-[12px] font-medium leading-[1.25] text-[#525252] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] outline-none transition-shadow placeholder:text-[#737373] focus:shadow-[0_0_0_1px_#8D87FF]";

function ScreenDraftRow({
  draft,
  submitLabel,
  onCancel,
  onSubmit,
}: {
  draft: ScreenDraft;
  submitLabel: string;
  onCancel: () => void;
  onSubmit: (draft: ScreenDraft) => void;
}) {
  const [title, setTitle] = useState(draft.title);
  const [description, setDescription] = useState(draft.description);
  const canSubmit = title.trim().length > 0 && description.trim().length > 0;

  return (
    <article className="rounded-[8px] bg-[#FAFAFA] p-[2px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
      <div className="flex flex-col gap-3 rounded-[6px] p-4">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className={DRAFT_FIELD_CLASSES}
          placeholder="Screen title, ex. Team Settings"
          aria-label="Screen title"
        />
        <input
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          className={DRAFT_FIELD_CLASSES}
          placeholder="What this screen is for, ex. manage members and roles"
          aria-label="Screen description"
        />
        <div className="flex items-center justify-end gap-2">
          <SecondaryButton size="action" onClick={onCancel}>
            Cancel
          </SecondaryButton>
          <PrimaryButton
            disabled={!canSubmit}
            onClick={() => onSubmit({ title, description, kind: "Page" })}
          >
            {submitLabel}
          </PrimaryButton>
        </div>
      </div>
    </article>
  );
}

function ScreenRow({
  screen,
  isGenerated = false,
  onToggle,
  onEdit,
  onDelete,
}: {
  screen: ScreenItem;
  isGenerated?: boolean;
  onToggle: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  return (
    <article className="rounded-[8px] bg-[#FAFAFA] p-[2px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
      <div className="flex items-end justify-between gap-4 rounded-[6px] p-4">
        <button
          type="button"
          onClick={onToggle}
          className="flex min-w-0 flex-1 items-start gap-[6px] text-left disabled:cursor-default"
          aria-pressed={screen.selected}
        >
          <span
            className={`mt-[1px] flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] ${
              screen.selected ? "bg-[#0A0A0A] text-white" : "bg-[#E5E5E5] text-transparent"
            }`}
          >
            <CheckIcon />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[13px] font-medium leading-[1.25] text-[#171717]">
              {screen.title}
            </span>
            <span className="mt-[7px] block truncate text-[12px] font-normal leading-[1.5] text-[#525252]">
              {screen.description}
            </span>
          </span>
        </button>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
          <Badge tone="blue">{screen.kind}</Badge>
          <Badge tone="rose">{screen.priority}</Badge>
          <Badge tone="stone">{screen.required ? "Recommended" : "Optional"}</Badge>
          {isGenerated ? <Badge tone="purple">Generated</Badge> : null}
          {onEdit ? (
            <button
              type="button"
              onClick={onEdit}
              aria-label={`Edit ${screen.title}`}
              className="ml-1 inline-flex h-[26px] w-[26px] items-center justify-center rounded-[6px] bg-white text-[#525252] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#F5F5F5]"
            >
              <EditIcon />
            </button>
          ) : null}
          {onDelete ? (
            <button
              type="button"
              onClick={onDelete}
              aria-label={`Delete ${screen.title}`}
              className="inline-flex h-[26px] w-[26px] items-center justify-center rounded-[6px] bg-white text-[#525252] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#FEF2F2] hover:text-[#DC2626]"
            >
              <TrashIcon />
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
