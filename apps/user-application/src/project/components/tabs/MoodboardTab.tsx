import { useState } from "react";
import type { Project } from "../../models/project";

const moodboardImages = [
  "/images/moodboard/reference-1.png",
  "/images/moodboard/reference-2.png",
  "/images/moodboard/reference-3.png",
  "/images/moodboard/reference-1.png",
  "/images/moodboard/reference-2.png",
  "/images/moodboard/reference-3.png",
];

type MoodboardMode = "upload" | "figma";
type MoodboardItem = {
  id: string;
  image: string;
  folder: string | null;
  isInMoodboard: boolean;
};

export function MoodboardTab({ project: _project }: { project: Project }) {
  const [mode, setMode] = useState<MoodboardMode>("upload");
  const [hasUploadedFiles, setHasUploadedFiles] = useState(false);
  const [items, setItems] = useState<MoodboardItem[]>(
    moodboardImages.map((image, index) => ({
      id: `reference-${index + 1}`,
      image,
      folder: null,
      isInMoodboard: false,
    })),
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(["reference-1", "reference-2"]),
  );
  const [folders, setFolders] = useState<string[]>([]);
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [draftFolderName, setDraftFolderName] = useState("");
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [isFolderMenuOpen, setIsFolderMenuOpen] = useState(false);
  const [figmaLink, setFigmaLink] = useState("");

  const selectedItems = items.filter((item) => selectedIds.has(item.id));
  const hasMoodboard = items.some((item) => item.isInMoodboard);
  const showFigmaImportGrid = mode === "figma";
  const showMoodboardGrid = hasMoodboard && !showFigmaImportGrid;
  const showGrid = showFigmaImportGrid || showMoodboardGrid;
  const visibleItems = items.filter((item) => {
    if (showFigmaImportGrid) return true;
    if (!item.isInMoodboard) return false;
    return activeFolder ? item.folder === activeFolder : true;
  });
  const canAddToMoodboard = mode === "figma" ? selectedItems.length > 0 : hasUploadedFiles;
  const showSelectionActions = hasMoodboard && selectedItems.length > 0;

  const commitFolder = () => {
    const name = draftFolderName.trim() || `Direction ${folders.length + 1}`;
    setFolders((current) => current.includes(name) ? current : [...current, name]);
    setActiveFolder(name);
    setDraftFolderName("");
    setIsCreatingFolder(false);
  };

  return (
    <section className="flex w-full flex-col gap-1 rounded-[12px] bg-[#F5F5F5] p-1 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
      <Header />

      {!showGrid ? (
        <div className="flex min-h-[420px] flex-1 items-center justify-center rounded-[8px] bg-white p-[clamp(24px,4.3vw,44px)] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
          <div className="flex w-full max-w-[611px] flex-col items-start gap-6">
            <ModeToggle mode={mode} onModeChange={setMode} />
            {mode === "upload" ? (
              <div className="flex w-full flex-col gap-3">
                <UploadDropzone onUpload={() => setHasUploadedFiles(true)} />
                {hasUploadedFiles ? <UploadedFilesList /> : null}
              </div>
            ) : (
              <FigmaLinkPanel
                compact={false}
                value={figmaLink}
                onChange={setFigmaLink}
                onSubmit={() => setSelectedIds(new Set(["reference-1", "reference-2"]))}
              />
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="rounded-[8px] bg-white p-4 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
            <div className="flex flex-col gap-6">
              <ModeToggle mode={mode} onModeChange={setMode} />
              <FigmaLinkPanel
                compact
                value={figmaLink}
                onChange={setFigmaLink}
                onSubmit={() => setSelectedIds(new Set(["reference-1", "reference-2"]))}
              />
            </div>
          </div>

          <div className={`relative flex flex-col rounded-[10px] bg-white shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] ${
            showFigmaImportGrid ? "gap-1 p-1" : "gap-2 p-4"
          }`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <FolderTabs
                folders={folders}
                activeFolder={activeFolder}
                isCreatingFolder={isCreatingFolder}
                draftFolderName={draftFolderName}
                onAll={() => setActiveFolder(null)}
                onFolderChange={setActiveFolder}
                onCreateFolder={() => {
                  setIsCreatingFolder(true);
                  setIsFolderMenuOpen(false);
                }}
                onDraftFolderNameChange={setDraftFolderName}
                onCommitFolder={commitFolder}
              />

              {showSelectionActions ? (
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    className="inline-flex h-8 cursor-pointer items-center justify-center rounded-[6px] bg-[#FAFAFA] px-3 text-[12px] font-medium leading-[1.25] text-[#EF4444] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#FEE2E2]"
                    onClick={() => {
                      setItems((current) => current.map((item) =>
                        selectedIds.has(item.id) ? { ...item, isInMoodboard: false, folder: null } : item,
                      ));
                      setSelectedIds(new Set());
                    }}
                  >
                    Delete from Moodboard
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-8 cursor-pointer items-center justify-center gap-2 rounded-[6px] border border-[#525252] bg-gradient-to-b from-[#404040] to-[#0A0A0A] py-2 pl-3 pr-[10px] text-[13px] font-medium leading-[1.25] text-[#FAFAFA] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-opacity hover:opacity-95"
                    onClick={() => {
                      setIsFolderMenuOpen((current) => !current);
                      if (folders.length === 0) {
                        setFolders(["Direction 1", "Direction 2", "Direction 3"]);
                      }
                    }}
                  >
                    Add to Folder
                    <PlusIcon className="h-[15px] w-[15px]" />
                  </button>
                </div>
              ) : null}
            </div>

            <MoodboardGrid
              items={visibleItems}
              selectedIds={selectedIds}
              onToggleSelect={(itemId) => {
                setSelectedIds((current) => {
                  const next = new Set(current);
                  if (next.has(itemId)) next.delete(itemId);
                  else next.add(itemId);
                  return next;
                });
              }}
            />

            {isFolderMenuOpen ? (
              <FolderMenu
                folders={folders.length > 0 ? folders : ["Direction 1", "Direction 2", "Direction 3"]}
                onSelectFolder={(folder) => {
                  setFolders((current) => current.includes(folder) ? current : [...current, folder]);
                  setItems((current) => current.map((item) =>
                    selectedIds.has(item.id) ? { ...item, folder, isInMoodboard: true } : item,
                  ));
                  setActiveFolder(folder);
                  setIsFolderMenuOpen(false);
                }}
              />
            ) : null}
          </div>
        </div>
      )}

      <Footer
        hasMoodboard={hasMoodboard}
        canAddToMoodboard={canAddToMoodboard}
        onAddToMoodboard={() => {
          if (!canAddToMoodboard) return;
          if (mode === "upload") {
            setMode("figma");
            setSelectedIds(new Set(["reference-1", "reference-2"]));
          }
          setItems((current) => current.map((item) =>
            selectedIds.has(item.id) || mode === "upload" ? { ...item, isInMoodboard: true } : item,
          ));
        }}
      />
    </section>
  );
}

function Header() {
  return (
    <div className="flex shrink-0 items-center justify-between p-4">
      <div className="min-w-0">
        <h2 className="text-[15px] font-medium leading-[1.25] text-[#0A0A0A]">Moodboard</h2>
        <p className="mt-1 max-w-[471px] text-[12px] font-medium leading-[1.5] text-[#525252]">
          Drop in screenshots or paste a figma link.
        </p>
      </div>
    </div>
  );
}

function ModeToggle({
  mode,
  onModeChange,
}: {
  mode: MoodboardMode;
  onModeChange: (mode: MoodboardMode) => void;
}) {
  return (
    <div className="inline-flex w-fit rounded-[8px] bg-[#F5F5F5] p-[2px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
      <button
        type="button"
        className={`inline-flex h-[27px] cursor-pointer items-center gap-2 rounded-[6px] py-[6px] pl-[10px] pr-3 text-[13px] font-medium leading-[1.25] transition-colors ${
          mode === "figma"
            ? "bg-white text-[#171717] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]"
            : "text-[#737373] hover:bg-white"
        }`}
        onClick={() => onModeChange("figma")}
      >
        <FigmaIcon />
        Figma Link
      </button>
      <button
        type="button"
        className={`inline-flex h-[27px] cursor-pointer items-center gap-2 rounded-[6px] py-[6px] pl-[10px] pr-3 text-[13px] font-medium leading-[1.25] transition-colors ${
          mode === "upload"
            ? "bg-white text-[#171717] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]"
            : "text-[#737373] hover:bg-white"
        }`}
        onClick={() => onModeChange("upload")}
      >
        <UploadFromDeviceIcon className="h-[15px] w-[15px]" />
        Upload from Device
      </button>
    </div>
  );
}

function FigmaLinkPanel({
  compact,
  value,
  onChange,
  onSubmit,
}: {
  compact: boolean;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <div className={`flex flex-col gap-2 ${compact ? "w-[290px]" : "w-full max-w-[360px]"}`}>
      <label className="text-[13px] font-medium leading-[1.25] text-[#171717]" htmlFor="moodboard-figma-link">
        Paste Figma Link
      </label>
      <div className="flex items-center gap-2">
        <input
          id="moodboard-figma-link"
          type="url"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") onSubmit();
          }}
          placeholder="ex. www.google.com"
          className="h-[38px] min-w-0 flex-1 rounded-[6px] bg-[#F5F5F5] px-3 text-[12px] font-medium leading-[1.25] text-[#262626] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] outline-none placeholder:text-[#525252] focus:ring-2 focus:ring-[#8D87FF]/30"
        />
        {!compact ? (
          <button
            type="button"
            className="inline-flex h-[38px] shrink-0 cursor-pointer items-center justify-center rounded-[6px] border border-[rgba(158,153,248,0.75)] bg-gradient-to-b from-[#7B76DF] to-[#463FBA] px-3 text-[13px] font-medium leading-[1.25] text-[#FAFAFA] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-opacity hover:opacity-95"
            onClick={onSubmit}
          >
            Import
          </button>
        ) : null}
      </div>
    </div>
  );
}

function UploadDropzone({ onUpload }: { onUpload: () => void }) {
  return (
    <div className="w-full rounded-[12px] bg-[#F5F5F5] p-1 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
      <label className="flex h-[245px] w-full cursor-pointer items-center justify-center rounded-[8px] bg-white p-[44px] text-center shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#FAFAFA]">
        <input
          type="file"
          multiple
          className="sr-only"
          accept="image/*,.pdf,.fig,.sketch,.ttf,.otf,.woff,.woff2"
          onChange={onUpload}
        />
        <span className="flex min-w-0 flex-1 flex-col items-center justify-center gap-3">
          <FolderUploadIcon />
          <span className="flex flex-col items-center gap-[6px]">
            <span className="text-[13px] font-medium leading-[1.25] text-[#171717]">
              Upload files or drag and drop
            </span>
            <span className="text-[12px] font-medium leading-[1.25] text-[#737373]">
              Images, PDFs, Fonts, Files etc.
            </span>
          </span>
        </span>
      </label>
    </div>
  );
}

function UploadedFilesList() {
  return (
    <div className="w-full rounded-[12px] bg-[#F5F5F5] p-1 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
      <div className="px-2 py-2 text-[13px] font-medium leading-[1.25] text-[#0A0A0A]">
        Uploaded Files
      </div>
      <div className="flex flex-col gap-1">
        {["file-one", "file-two"].map((id) => (
          <div
            key={id}
            className="flex items-center justify-between rounded-[8px] bg-white p-2 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]"
          >
            <div className="flex min-w-0 items-center gap-2">
              <FolderUploadIcon />
              <span className="truncate text-[13px] font-medium leading-[1.25] text-[#171717]">
                Example.fig
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span className="text-[12px] font-medium leading-[1.25] text-[#737373]">
                2.3MB
              </span>
              <TrashIcon />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FolderTabs({
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
          placeholder="Name your folder"
          className="h-[27px] w-[132px] rounded-[6px] bg-[#D4D4D4] px-[10px] text-[13px] font-medium leading-[1.25] text-[#0A0A0A] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] outline-none placeholder:text-[#0A0A0A]"
        />
      ) : (
        <button
          type="button"
          className="inline-flex h-[27px] cursor-pointer items-center gap-[6px] rounded-[6px] py-[6px] pl-[10px] pr-3 text-[13px] font-medium leading-[1.25] text-[#525252] transition-colors hover:bg-white"
          onClick={onCreateFolder}
        >
          <PlusIcon className="h-[15px] w-[15px]" />
          Create Folder
        </button>
      )}
    </div>
  );
}

function MoodboardGrid({
  items,
  selectedIds,
  onToggleSelect,
}: {
  items: MoodboardItem[];
  selectedIds: Set<string>;
  onToggleSelect: (itemId: string) => void;
}) {
  return (
    <div className="grid w-full grid-cols-1 gap-1 md:grid-cols-3">
      {items.map((item) => {
        const isSelected = selectedIds.has(item.id);
        return (
          <button
            key={item.id}
            type="button"
            className="relative min-w-0 cursor-pointer rounded-[8px] bg-[#FAFAFA] p-2 text-left shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-transform hover:-translate-y-px"
            onClick={() => onToggleSelect(item.id)}
          >
            <div className="relative aspect-[1920/1325] w-full overflow-hidden rounded-[4px]">
              <img
                src={item.image}
                alt=""
                className="h-full w-full rounded-[4px] object-cover"
              />
              {isSelected ? <div className="absolute inset-0 rounded-[4px] bg-black/50" /> : null}
            </div>
            <span className={`absolute left-[19px] top-[18px] flex h-5 w-5 items-center justify-center rounded-full p-[2px] ${
              isSelected ? "bg-[#FAFAFA]" : "bg-[#E5E5E5]"
            }`}>
              {isSelected ? <CheckIcon /> : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function FolderMenu({
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

function Footer({
  hasMoodboard,
  canAddToMoodboard,
  onAddToMoodboard,
}: {
  hasMoodboard: boolean;
  canAddToMoodboard: boolean;
  onAddToMoodboard: () => void;
}) {
  return (
    <div className="flex shrink-0 items-center justify-end rounded-[8px] bg-white px-4 py-3 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
      <button
        type="button"
        disabled={!canAddToMoodboard && !hasMoodboard}
        className={`inline-flex h-8 items-center justify-center gap-2 rounded-[6px] border border-[rgba(158,153,248,0.75)] bg-gradient-to-b from-[#7B76DF] to-[#463FBA] py-2 pl-[10px] pr-3 text-[13px] font-medium leading-[1.25] text-[#FAFAFA] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-opacity ${
          canAddToMoodboard || hasMoodboard ? "cursor-pointer hover:opacity-95" : "cursor-not-allowed opacity-50"
        }`}
        onClick={hasMoodboard ? undefined : onAddToMoodboard}
      >
        {hasMoodboard ? "Continue to flows" : canAddToMoodboard ? "Add to Moodboard" : "Create Moodboard"}
        <ArrowRightIcon />
      </button>
    </div>
  );
}

function FigmaIcon() {
  return (
    <img src="/logos/integrations/figma.svg" alt="" aria-hidden="true" className="h-[15px] w-[10px] shrink-0" />
  );
}

function FolderUploadIcon() {
  return <UploadFromDeviceIcon className="h-5 w-5" />;
}

function FolderIcon() {
  return (
    <span
      aria-hidden="true"
      className="h-[15px] w-[15px] shrink-0 bg-current"
      style={{
        WebkitMask: 'url("/logos/dashboard/folder.svg") center / contain no-repeat',
        mask: 'url("/logos/dashboard/folder.svg") center / contain no-repeat',
      }}
    />
  );
}

function UploadFromDeviceIcon({ className }: { className: string }) {
  return (
    <span
      aria-hidden="true"
      className={`${className} shrink-0 bg-current`}
      style={{
        WebkitMask: 'url("/logos/dashboard/upload-from-device.svg") center / contain no-repeat',
        mask: 'url("/logos/dashboard/upload-from-device.svg") center / contain no-repeat',
      }}
    />
  );
}

function PlusIcon({ className }: { className: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      aria-hidden="true"
      className={`${className} shrink-0`}
    >
      <path d="M8 3.5v9M3.5 8h9" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-4 w-4 text-[#171717]"
    >
      <path d="m4 8.4 2.4 2.4L12 5.2" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-[14px] w-[14px] shrink-0 text-[#EF4444]"
    >
      <path d="M3.5 5h9M6.5 5V3.8h3V5M5 5l.4 7.2c.1.6.5 1 1.1 1h3c.6 0 1-.4 1.1-1L11 5" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-4 w-4 shrink-0"
    >
      <path d="M3 8h9M8.5 4.5 12 8l-3.5 3.5" />
    </svg>
  );
}
