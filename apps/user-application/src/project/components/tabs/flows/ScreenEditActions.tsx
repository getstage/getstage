import { SaveIcon } from "./flowsIcons";

export function ScreenEditActions({ onDiscard, onSave }: { onDiscard: () => void; onSave: () => void }) {
  return (
    <div className="flex items-start gap-2">
      <button
        type="button"
        onClick={onDiscard}
        className="inline-flex h-[32px] items-center justify-center rounded-[6px] bg-[#FAFAFA] pl-[10px] pr-3 text-[12px] font-medium leading-[1.25] text-[#EF4444] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-colors hover:bg-white"
      >
        Discard Changes
      </button>
      <button
        type="button"
        onClick={onSave}
        className="inline-flex h-[32px] items-center justify-center gap-2 rounded-[6px] border border-[#34D399] bg-gradient-to-b from-[#10B981] to-[#059669] px-3 text-[12px] font-medium leading-[1.25] text-[#ECFDF5] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-opacity hover:opacity-90"
      >
        <SaveIcon className="h-4 w-4 shrink-0" />
        Save Changes
      </button>
    </div>
  );
}
