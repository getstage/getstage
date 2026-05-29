import { EditIcon, SaveIcon } from "./flowsIcons";

export function FlowActions({
  editing,
  onBeginEdit,
  onDiscard,
  onSave,
}: {
  editing: boolean;
  onBeginEdit: () => void;
  onDiscard: () => void;
  onSave: () => void;
}) {
  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onDiscard}
          className="inline-flex h-[32px] items-center rounded-[6px] border border-[#E5E5E5] bg-[#FAFAFA] px-3 text-[13px] font-medium leading-[1.25] text-[#DC2626] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.15)] transition-colors hover:bg-white"
        >
          Discard Changes
        </button>
        <button
          type="button"
          onClick={onSave}
          className="inline-flex h-[32px] items-center gap-2 rounded-[6px] bg-[#059669] px-3 text-[13px] font-medium leading-[1.25] text-white shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#047857]"
        >
          <SaveIcon />
          Save Changes
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onBeginEdit}
      className="inline-flex h-[32px] items-center gap-2 rounded-[6px] border border-[#E5E5E5] bg-[#FAFAFA] px-3 text-[13px] font-medium leading-[1.25] text-[#525252] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.15)] transition-colors hover:bg-white"
    >
      <EditIcon />
      Edit Steps
    </button>
  );
}
