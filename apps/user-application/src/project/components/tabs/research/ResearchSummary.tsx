import { researchSummary } from "../../../data/fixtures/researchTabFixtures";
import { EditIcon, SaveIcon } from "./researchIcons";

type ResearchSummaryProps = {
  isEditing: boolean;
  onEdit: () => void;
  onDiscard: () => void;
  onSave: () => void;
};

export function ResearchSummary({ isEditing, onEdit, onDiscard, onSave }: ResearchSummaryProps) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-[15px] font-medium leading-[1.25] text-[#171717]">Research Summary</h2>
        {isEditing ? (
          <div className="flex shrink-0 items-start gap-2">
            <button
              type="button"
              onClick={onDiscard}
              className="inline-flex h-[31px] items-center justify-center rounded-[6px] bg-[#F5F5F5] px-[10px] text-[12px] font-medium leading-[1.25] text-[#EF4444] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#FEE2E2]"
            >
              Discard Changes
            </button>
            <button
              type="button"
              onClick={onSave}
              className="inline-flex h-[31px] items-center justify-center gap-2 rounded-[6px] border border-[#34D399] bg-gradient-to-b from-[#10B981] to-[#059669] px-3 text-[12px] font-medium leading-[1.25] text-[#ECFDF5] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-opacity hover:opacity-95"
            >
              <SaveIcon />
              Save Changes
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex h-[34px] shrink-0 cursor-pointer items-center justify-center gap-2 rounded-[6px] bg-[#F5F5F5] py-2 pl-[10px] pr-3 text-[13px] font-medium leading-none text-[#525252] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#ECECEC]"
          >
            <EditIcon />
            Edit Research
          </button>
        )}
      </div>
      {isEditing ? (
        <textarea
          defaultValue={researchSummary.join(" ")}
          className="min-h-[124px] w-full resize-y rounded-[8px] border border-[#E5E5E5] bg-[#FAFAFA] px-3 py-[10px] text-[13px] font-medium leading-[1.5] text-[#525252] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.15)]"
          aria-label="Research summary"
        />
      ) : (
        <ul className="list-disc space-y-0 pl-[19.5px] text-[13px] font-medium leading-[1.5] text-[#525252]">
          {researchSummary.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
