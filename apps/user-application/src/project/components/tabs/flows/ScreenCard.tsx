import type { ProjectScreen } from "../../../models/project";
import { EditIcon, HomeIcon, SparkleIcon } from "./flowsIcons";
import { ScreenEditActions } from "./ScreenEditActions";
import { ScreenElementList } from "./ScreenElementList";

export function ScreenCard({
  screen,
  editing,
  draftElements,
  onBeginEdit,
  onDraftElementChange,
  onDiscard,
  onSave,
}: {
  screen: ProjectScreen;
  editing: boolean;
  draftElements: string[];
  onBeginEdit: () => void;
  onDraftElementChange: (elementIndex: number, value: string) => void;
  onDiscard: () => void;
  onSave: () => void;
}) {
  const elements = editing ? draftElements : screen.keyElements;

  return (
    <article className="flex min-h-[331px] flex-col justify-between gap-6 rounded-[8px] bg-white px-4 py-3 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
      <div className="flex flex-col gap-6">
        <div className="flex items-start gap-3">
          <div className="flex h-[27px] w-[27px] shrink-0 items-center justify-center rounded-[4px] bg-[#F5F5F5] p-[6px] text-[#737373]">
            <HomeIcon />
          </div>
          <div className="min-w-0 pt-[1px]">
            <div className="flex flex-wrap items-center gap-1">
              <h3 className="text-[13px] font-medium leading-[1.25] text-[#171717]">{screen.title}</h3>
              <span className="inline-flex h-[19px] items-center rounded-[2px] bg-[#F5F5F4] px-[6px] text-[12px] font-normal leading-[1.25] text-[#44403C]">
                Appears in {screen.flowCount} flows
              </span>
            </div>
            <p className="mt-2 text-[12px] font-normal leading-[1.25] text-[#525252]">
              {screen.description}
            </p>
          </div>
        </div>

        <div className="flex flex-col">
          <div className="pb-0 pl-[10px] pr-3 pt-[6px] text-[12px] font-medium uppercase leading-[1.25] text-[#737373]">
            Key Elements
          </div>
          {editing ? (
            <div className="mt-2 flex flex-col gap-4 rounded-[8px] bg-[#FAFAFA] p-2 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
              <ScreenElementList elements={elements} editing onDraftElementChange={onDraftElementChange} />
              <button
                type="button"
                className="inline-flex h-[30px] w-fit items-center gap-2 rounded-[4px] bg-white px-3 text-[12px] font-medium leading-[1.25] text-[#7C3AED] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#F5F3FF]"
              >
                <SparkleIcon />
                Regenerate with AI
              </button>
            </div>
          ) : (
            <ScreenElementList elements={elements} />
          )}
        </div>
      </div>

      {editing ? (
        <ScreenEditActions onDiscard={onDiscard} onSave={onSave} />
      ) : (
        <button
          type="button"
          onClick={onBeginEdit}
          className="inline-flex h-[32px] w-fit items-center gap-2 rounded-[6px] border border-[#E5E5E5] bg-[#FAFAFA] px-3 text-[13px] font-medium leading-[1.25] text-[#525252] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.15)] transition-colors hover:bg-white"
        >
          <EditIcon />
          Edit Elements
        </button>
      )}
    </article>
  );
}
