import { PlusIcon } from "./moodboardIcons";

export function FolderTabs({
  folders,
  activeFolder,
  isCreatingFolder,
  draftFolderName,
  onAll,
  onFolderChange,
  onCreateFolder,
  onDraftFolderNameChange,
  onCommitFolder,
}: {
  folders: string[];
  activeFolder: string | null;
  isCreatingFolder: boolean;
  draftFolderName: string;
  onAll: () => void;
  onFolderChange: (folder: string) => void;
  onCreateFolder: () => void;
  onDraftFolderNameChange: (value: string) => void;
  onCommitFolder: () => void;
}) {
  return (
    <div className="inline-flex rounded-[8px] bg-[#F5F5F5] p-[2px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
      <button
        type="button"
        className={`inline-flex h-[27px] cursor-pointer items-center rounded-[6px] px-4 text-[13px] font-medium leading-[1.25] text-[#171717] ${
          activeFolder === null ? "bg-white shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]" : ""
        }`}
        onClick={onAll}
      >
        All
      </button>
      {folders.map((folder) => (
        <button
          key={folder}
          type="button"
          className={`inline-flex h-[27px] cursor-pointer items-center rounded-[6px] py-[6px] pl-[10px] pr-3 text-[13px] font-medium leading-[1.25] text-[#0A0A0A] ${
            activeFolder === folder ? "bg-white shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]" : ""
          }`}
          onClick={() => onFolderChange(folder)}
        >
          {folder}
        </button>
      ))}
      {isCreatingFolder ? (
        <input
          value={draftFolderName}
          onChange={(event) => onDraftFolderNameChange(event.target.value)}
          onBlur={onCommitFolder}
          onKeyDown={(event) => {
            if (event.key === "Enter") onCommitFolder();
          }}
          autoFocus
          placeholder="Type here..."
          className="h-[27px] w-[132px] rounded-[6px] bg-[#D4D4D4] px-[10px] text-[13px] font-medium leading-[1.25] text-[#0A0A0A] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] outline-none placeholder:text-[#0A0A0A]"
        />
      ) : (
        <button
          type="button"
          className="inline-flex h-[27px] cursor-pointer items-center gap-[6px] rounded-[6px] py-[6px] pl-[10px] pr-3 text-[13px] font-medium leading-[1.25] text-[#525252] transition-colors hover:bg-white"
          onClick={onCreateFolder}
        >
          <PlusIcon className="h-[15px] w-[15px]" />
          Direction Hub
        </button>
      )}
    </div>
  );
}
