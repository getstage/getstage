import { useState } from "react";
import type { ProviderId } from "@stage/data-ops/contracts";
import { AiRunSettings } from "@/components/project/AiRunSettings";
import type { ResearchProviderOption } from "@/hooks/project/research/useResearchProviderSelection";
import type { ScreenItem } from "@/types/project/wireframesTab";
import { Badge, PrimaryButton, SecondaryButton } from "./WireframePrimitives";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  EditIcon,
  PlusIcon,
  TrashIcon,
} from "./wireframesIcons";

export type ScreenDraft = Pick<ScreenItem, "title" | "description" | "kind">;

const EMPTY_SCREEN_DRAFT: ScreenDraft = {
  title: "",
  description: "",
  kind: "Page",
};

export function ConfigureStep({
  screens,
  selectedCount,
  providerOptions,
  selectedProviderId,
  onSelectProvider,
  onBackToResults,
  onToggle,
  onAddScreen,
  onEditScreen,
  onDeleteScreen,
  onGenerate,
}: {
  screens: ScreenItem[];
  selectedCount: number;
  providerOptions: ResearchProviderOption[];
  selectedProviderId: ProviderId | null;
  onSelectProvider: (providerId: ProviderId) => void;
  onBackToResults?: () => void;
  onToggle: (id: string) => void;
  onAddScreen: (draft: ScreenDraft) => void;
  onEditScreen: (id: string, draft: ScreenDraft) => void;
  onDeleteScreen: (id: string) => void;
  onGenerate: () => void;
}) {
  const [editingScreenId, setEditingScreenId] = useState<string | null>(null);
  const [addingScreen, setAddingScreen] = useState(false);

  return (
    <div className="rounded-[12px] bg-[#F5F5F5] p-1 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
      <div className="flex flex-col gap-[10px] p-4">
        <div>
          <h2 className="text-[15px] font-medium leading-[1.25] text-[#0A0A0A]">
            Generate Wireframes
          </h2>
          <p className="mt-[10px] max-w-[354px] text-[12px] font-medium leading-[1.5] text-[#525252]">
            AI will produce low-fidelity block layouts for the selected screens.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 text-[13px] font-medium leading-[1.25]">
            <span className="text-[#171717]">
              {screens.length} {screens.length === 1 ? "screen" : "screens"} in this project
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3">
            {onBackToResults ? (
              <SecondaryButton purple onClick={onBackToResults}>
                <ArrowLeftIcon />
                Back to wireframes
              </SecondaryButton>
            ) : null}
          </div>
        </div>
      </div>

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
                setAddingScreen(true);
              }}
            >
              <PlusIcon />
              Add screen
            </SecondaryButton>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          {screens.map((screen) =>
            editingScreenId === screen.id ? (
              <ScreenDraftRow
                key={screen.id}
                initialValue={screen}
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
                onToggle={() => onToggle(screen.id)}
                onEdit={() => {
                  setAddingScreen(false);
                  setEditingScreenId(screen.id);
                }}
                onDelete={() => onDeleteScreen(screen.id)}
              />
            ),
          )}
          {addingScreen ? (
            <ScreenDraftRow
              initialValue={EMPTY_SCREEN_DRAFT}
              submitLabel="Add screen"
              onCancel={() => setAddingScreen(false)}
              onSubmit={(draft) => {
                onAddScreen(draft);
                setAddingScreen(false);
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
          />
        </div>
        <div className="mt-6 flex justify-end">
          <PrimaryButton onClick={onGenerate} disabled={selectedCount === 0 || !selectedProviderId}>
            Generate {selectedCount} Wireframes
            <ArrowRightIcon />
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}

export function ScreenRow({
  screen,
  onToggle,
  onEdit,
  onDelete,
}: {
  screen: ScreenItem;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
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
          <button
            type="button"
            onClick={onEdit}
            aria-label={`Edit ${screen.title}`}
            className="ml-1 inline-flex h-7 w-7 items-center justify-center rounded-[6px] text-[#525252] hover:bg-[#E5E5E5] hover:text-[#171717]"
          >
            <EditIcon />
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label={`Delete ${screen.title}`}
            className="inline-flex h-7 w-7 items-center justify-center rounded-[6px] text-[#737373] hover:bg-[#FEE2E2] hover:text-[#B91C1C]"
          >
            <TrashIcon />
          </button>
        </div>
      </div>
    </article>
  );
}

function ScreenDraftRow({
  initialValue,
  submitLabel,
  onCancel,
  onSubmit,
}: {
  initialValue: ScreenDraft;
  submitLabel: string;
  onCancel: () => void;
  onSubmit: (draft: ScreenDraft) => void;
}) {
  const [draft, setDraft] = useState<ScreenDraft>({
    title: initialValue.title,
    description: initialValue.description,
    kind: initialValue.kind,
  });
  const canSubmit = draft.title.trim().length > 0 && draft.description.trim().length > 0;
  const inputClass =
    "w-full rounded-[6px] bg-white px-3 py-2 text-[12px] text-[#171717] shadow-[0_0_0_1px_#D4D4D4] outline-none focus:shadow-[0_0_0_1px_#8D87FF]";

  return (
    <div className="rounded-[8px] bg-[#F5F5F5] p-4 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
      <div className="grid gap-3 md:grid-cols-[1fr_1.5fr_140px]">
        <input
          className={inputClass}
          value={draft.title}
          placeholder="Screen name"
          onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
        />
        <input
          className={inputClass}
          value={draft.description}
          placeholder="What should this screen do?"
          onChange={(event) =>
            setDraft((current) => ({ ...current, description: event.target.value }))
          }
        />
        <select
          className={inputClass}
          value={draft.kind}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              kind: event.target.value as ScreenItem["kind"],
            }))
          }
        >
          <option value="Page">Page</option>
          <option value="Section">Section</option>
        </select>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <SecondaryButton onClick={onCancel}>Cancel</SecondaryButton>
        <PrimaryButton
          disabled={!canSubmit}
          onClick={() =>
            onSubmit({
              title: draft.title.trim(),
              description: draft.description.trim(),
              kind: draft.kind,
            })
          }
        >
          {submitLabel}
        </PrimaryButton>
      </div>
    </div>
  );
}
