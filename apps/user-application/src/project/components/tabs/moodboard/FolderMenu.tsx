import { DirectionIcon, PlusIcon } from "./moodboardIcons";

export function FolderMenu({
  folders,
  creating,
  draftName,
  onSelectFolder,
  onCreateFolder,
  onDraftNameChange,
  onCommitFolder,
}: {
  folders: string[];
  creating?: boolean;
  draftName?: string;
  onSelectFolder: (folder: string) => void;
  onCreateFolder?: () => void;
  onDraftNameChange?: (value: string) => void;
  onCommitFolder?: () => void;
}) {
  return (
    <div className="absolute right-3 top-[52px] z-10 w-[212px] rounded-[8px] border-2 border-black/5 bg-gradient-to-b from-white to-[#FAFAFA] p-3 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
      <div className="text-[12px] font-medium leading-[1.5] text-[#0A0A0A]">
        Select Direction
      </div>
      <div className="my-[6px] h-px w-full bg-[#E5E5E5]" />
      <div className="flex flex-col gap-[6px]">
        {folders.map((folder) => (
          <button
            key={folder}
            type="button"
            className="inline-flex h-7 cursor-pointer items-center gap-2 rounded-[6px] px-2 py-[6px] text-[12px] font-medium leading-[1.25] text-[#262626] transition-colors hover:bg-[#F5F5F5]"
            onClick={() => onSelectFolder(folder)}
          >
            <DirectionIcon className="h-4 w-4" />
            {folder}
          </button>
        ))}
        {creating ? (
          <>
            <label className="inline-flex h-7 items-center gap-2 rounded-[6px] bg-[#E5E5E5] px-2 py-[6px] text-[12px] font-medium leading-[1.25] text-[#262626]">
              <DirectionIcon className="h-4 w-4" />
              <input
                value={draftName ?? ""}
                onChange={(event) => onDraftNameChange?.(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") onCommitFolder?.();
                }}
                autoFocus
                placeholder="Type here..."
                className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-[#262626]"
              />
            </label>
            <button
              type="button"
              className="inline-flex h-8 w-full items-center justify-center rounded-[6px] border border-[#525252] bg-gradient-to-b from-[#404040] to-[#0A0A0A] px-3 text-[11px] font-medium leading-[1.25] text-[#FAFAFA] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]"
              onClick={onCommitFolder}
            >
              Save Direction
            </button>
          </>
        ) : (
          <button
            type="button"
            className="inline-flex h-7 cursor-pointer items-center gap-2 rounded-[6px] px-2 py-[6px] text-[12px] font-medium leading-[1.25] text-[#262626] transition-colors hover:bg-[#F5F5F5]"
            onClick={onCreateFolder}
          >
            <PlusIcon className="h-4 w-4" />
            Add New Direction
          </button>
        )}
      </div>
    </div>
  );
}
