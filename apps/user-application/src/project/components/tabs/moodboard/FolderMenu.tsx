import { FolderIcon } from "./moodboardIcons";

export function FolderMenu({
  folders,
  onSelectFolder,
}: {
  folders: string[];
  onSelectFolder: (folder: string) => void;
}) {
  return (
    <div className="absolute right-3 top-[52px] z-10 w-[212px] rounded-[8px] border-2 border-black/5 bg-gradient-to-b from-white to-[#FAFAFA] p-3 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
      <div className="text-[12px] font-medium leading-[1.5] text-[#0A0A0A]">
        Select Folder
      </div>
      <div className="my-[6px] h-px w-full bg-[#E5E5E5]" />
      <div className="flex flex-col">
        {folders.map((folder) => (
          <button
            key={folder}
            type="button"
            className="inline-flex h-7 cursor-pointer items-center gap-2 rounded-[6px] px-2 py-[6px] text-[12px] font-medium leading-[1.25] text-[#262626] transition-colors hover:bg-[#F5F5F5]"
            onClick={() => onSelectFolder(folder)}
          >
            <FolderIcon />
            {folder}
          </button>
        ))}
      </div>
    </div>
  );
}
