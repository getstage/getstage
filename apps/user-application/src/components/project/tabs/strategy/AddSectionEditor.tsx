import { CheckIcon } from "./strategyIcons";

export function AddSectionEditor({
  title,
  body,
  onTitleChange,
  onBodyChange,
  onSave,
  onCancel,
}: {
  title: string;
  body: string;
  onTitleChange: (value: string) => void;
  onBodyChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center">
        <input
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
          aria-label="New strategy section title"
          className="h-[31px] w-[145px] rounded-[4px] bg-[#F5F5F5] px-3 text-[15px] font-medium leading-[1.25] text-[#525252] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] outline-none"
        />
      </div>
      <div className="flex min-h-[164px] flex-col justify-between rounded-[8px] bg-[#F5F5F5] p-3 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
        <textarea
          value={body}
          onChange={(event) => onBodyChange(event.target.value)}
          placeholder="Write here..."
          aria-label="New strategy section content"
          className="min-h-[96px] resize-none bg-transparent text-[13px] font-medium leading-[1.4] text-[#525252] outline-none placeholder:text-[#525252]"
        />
        <div className="flex gap-1">
          <button type="button" onClick={onSave} className="inline-flex h-[27px] cursor-pointer items-center gap-2 rounded-[4px] border border-[#34D399] bg-gradient-to-b from-[#10B981] to-[#059669] px-3 py-[6px] text-[12px] font-medium leading-[1.25] text-[#ECFDF5] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] hover:opacity-95">
            <CheckIcon />
            Approve & Save
          </button>
          <button type="button" onClick={onCancel} className="inline-flex h-[27px] cursor-pointer items-center rounded-[4px] bg-white px-3 py-[6px] text-[12px] font-medium leading-[1.25] text-[#EF4444] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.18)] hover:bg-[#FEF2F2]">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
