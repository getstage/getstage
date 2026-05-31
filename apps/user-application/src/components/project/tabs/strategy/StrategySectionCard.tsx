import type { StrategySection } from "@/models/project/strategyTab";
import { EditableStrategyContent } from "./EditableStrategySection";
import { StrategyContent } from "./StrategyContent";
import { StatusPill } from "./StrategyStatus";
import { CheckIcon, RegenerateIcon } from "./strategyIcons";

export function StrategySectionCard({
  section,
  showDivider,
  isEditing,
  onSectionChange,
  onApprove,
  onRegenerate,
}: {
  section: StrategySection;
  showDivider: boolean;
  isEditing: boolean;
  onSectionChange: (section: StrategySection) => void;
  onApprove: () => void;
  onRegenerate: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      {showDivider ? <div className="h-px w-full bg-[#E5E5E5]" /> : null}
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-[15px] font-medium leading-[1.25] text-[#171717]">{section.title}</h2>
          <StatusPill status={section.status} />
        </div>
        {isEditing ? (
          <EditableStrategyContent
            section={section}
            onChange={onSectionChange}
            onRegenerate={onRegenerate}
          />
        ) : (
          <StrategyContent section={section} />
        )}
        {!isEditing && section.status === "action" ? (
          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={onApprove}
              className="inline-flex h-[27px] cursor-pointer items-center gap-2 rounded-[4px] border border-[#34D399] bg-gradient-to-b from-[#10B981] to-[#059669] px-3 py-[6px] text-[12px] font-medium leading-[1.25] text-[#ECFDF5] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] hover:opacity-95"
            >
              <CheckIcon />
              Approve & Save
            </button>
            <button
              type="button"
              onClick={onRegenerate}
              className="inline-flex h-[27px] cursor-pointer items-center gap-2 rounded-[4px] bg-white px-3 py-[6px] text-[12px] font-medium leading-[1.25] text-[#7C3AED] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] hover:bg-[#F5F3FF]"
            >
              <RegenerateIcon />
              Regenerate with AI
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
