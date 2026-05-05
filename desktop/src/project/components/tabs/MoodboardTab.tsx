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

export function MoodboardTab({ project: _project }: { project: Project }) {
  const [mode, setMode] = useState<MoodboardMode>("upload");
  const [hasUploadedFiles, setHasUploadedFiles] = useState(false);
  const [hasMoodboard, setHasMoodboard] = useState(false);
  const [selectedCount, setSelectedCount] = useState(0);
  const [folderState, setFolderState] = useState<"none" | "naming" | "named">("none");
  const [isFolderMenuOpen, setIsFolderMenuOpen] = useState(false);

  const canAddToMoodboard = mode === "figma" || hasUploadedFiles;
  const showGrid = hasMoodboard;
  const showSelectionActions = selectedCount > 0;

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
              <FigmaLinkPanel compact={false} />
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="rounded-[8px] bg-white p-4 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
            <div className="flex flex-col gap-6">
              <ModeToggle mode={mode} onModeChange={setMode} />
              <FigmaLinkPanel compact />
            </div>
          </div>

          <div className="relative flex flex-col gap-2 rounded-[10px] bg-white p-4 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <FolderTabs
                folderState={folderState}
                onCreateFolder={() => setFolderState("naming")}
              />

              {showSelectionActions ? (
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    className="inline-flex h-8 cursor-pointer items-center justify-center rounded-[6px] bg-[#FAFAFA] px-3 text-[12px] font-medium leading-none text-[#EF4444] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#FEE2E2]"
                    onClick={() => setSelectedCount(0)}
                  >
                    Delete from Moodboard
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-8 cursor-pointer items-center justify-center gap-2 rounded-[6px] border border-[#525252] bg-gradient-to-b from-[#404040] to-[#0A0A0A] py-2 pl-3 pr-[10px] text-[13px] font-medium leading-none text-[#FAFAFA] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-opacity hover:opacity-95"
                    onClick={() => {
                      setIsFolderMenuOpen((current) => !current);
                      setFolderState((current) => current === "none" ? "named" : current);
                    }}
                  >
                    Add to Folder
                    <PlusIcon className="h-[15px] w-[15px]" />
                  </button>
                </div>
              ) : null}
            </div>

            <MoodboardGrid
              selectedCount={selectedCount}
              onToggleSelect={(isSelected) =>
                setSelectedCount((current) => Math.max(0, current + (isSelected ? -1 : 1)))
              }
            />

            {isFolderMenuOpen ? <FolderMenu /> : null}
          </div>
        </div>
      )}

      <Footer
        hasMoodboard={hasMoodboard}
        canAddToMoodboard={canAddToMoodboard}
        onAddToMoodboard={() => {
          if (!canAddToMoodboard) return;
          setHasMoodboard(true);
          setMode("figma");
          setSelectedCount(2);
        }}
      />
    </section>
  );
}

function Header() {
  return (
    <div className="flex shrink-0 items-center justify-between p-4">
      <div className="min-w-0">
        <h2 className="text-[15px] font-medium leading-none text-[#0A0A0A]">Moodboard</h2>
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
        className={`inline-flex h-[27px] cursor-pointer items-center gap-2 rounded-[6px] py-[6px] pl-[10px] pr-3 text-[13px] font-medium leading-none transition-colors ${
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
        className={`inline-flex h-[27px] cursor-pointer items-center gap-2 rounded-[6px] py-[6px] pl-[10px] pr-3 text-[13px] font-medium leading-none transition-colors ${
          mode === "upload"
            ? "bg-white text-[#171717] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]"
            : "text-[#737373] hover:bg-white"
        }`}
        onClick={() => onModeChange("upload")}
      >
        <FolderIcon />
        Upload from Device
      </button>
    </div>
  );
}

function FigmaLinkPanel({ compact }: { compact: boolean }) {
  return (
    <label className={`flex flex-col gap-2 ${compact ? "w-[290px]" : "w-full max-w-[290px]"}`}>
      <span className="text-[13px] font-medium leading-none text-[#171717]">
        Paste Figma Link
      </span>
      <input
        type="url"
        placeholder="ex. www.google.com"
        className="h-[38px] w-full rounded-[6px] bg-[#F5F5F5] px-3 text-[12px] font-medium leading-none text-[#262626] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] outline-none placeholder:text-[#525252] focus:ring-2 focus:ring-[#8D87FF]/30"
      />
    </label>
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
            <span className="text-[13px] font-medium leading-none text-[#171717]">
              Upload files or drag and drop
            </span>
            <span className="text-[12px] font-medium leading-none text-[#737373]">
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
      <div className="px-2 py-2 text-[13px] font-medium leading-none text-[#0A0A0A]">
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
              <span className="truncate text-[13px] font-medium leading-none text-[#171717]">
                Example.fig
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span className="text-[12px] font-medium leading-none text-[#737373]">
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
  folderState,
  onCreateFolder,
}: {
  folderState: "none" | "naming" | "named";
  onCreateFolder: () => void;
}) {
  return (
    <div className="inline-flex rounded-[8px] bg-[#F5F5F5] p-[2px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
      <button
        type="button"
        className="inline-flex h-[27px] cursor-pointer items-center rounded-[6px] bg-white px-4 text-[13px] font-medium leading-none text-[#171717] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]"
      >
        All
      </button>
      {folderState === "none" ? (
        <button
          type="button"
          className="inline-flex h-[27px] cursor-pointer items-center gap-[6px] rounded-[6px] py-[6px] pl-[10px] pr-3 text-[13px] font-medium leading-none text-[#525252] transition-colors hover:bg-white"
          onClick={onCreateFolder}
        >
          <PlusIcon className="h-[15px] w-[15px]" />
          Create Folder
        </button>
      ) : (
        <button
          type="button"
          className={`inline-flex h-[27px] cursor-pointer items-center rounded-[6px] py-[6px] pl-[10px] pr-3 text-[13px] font-medium leading-none text-[#0A0A0A] ${
            folderState === "naming" ? "bg-[#D4D4D4] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]" : ""
          }`}
        >
          {folderState === "naming" ? "Name your folder" : "Direction 1"}
        </button>
      )}
    </div>
  );
}

function MoodboardGrid({
  selectedCount,
  onToggleSelect,
}: {
  selectedCount: number;
  onToggleSelect: (isSelected: boolean) => void;
}) {
  return (
    <div className="grid w-full grid-cols-1 gap-1 md:grid-cols-3">
      {moodboardImages.map((image, index) => {
        const isSelected = selectedCount > index && index < 2;
        return (
          <button
            key={`${image}-${index}`}
            type="button"
            className="relative min-w-0 cursor-pointer rounded-[8px] bg-[#FAFAFA] p-2 text-left shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-transform hover:-translate-y-px"
            onClick={() => onToggleSelect(isSelected)}
          >
            <div className="relative aspect-[1920/1325] w-full overflow-hidden rounded-[4px]">
              <img
                src={image}
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

function FolderMenu() {
  return (
    <div className="absolute right-3 top-[52px] z-10 w-[212px] rounded-[8px] border-2 border-black/5 bg-gradient-to-b from-white to-[#FAFAFA] p-3 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
      <div className="text-[12px] font-medium leading-[1.5] text-[#0A0A0A]">
        Select Folder
      </div>
      <div className="my-[6px] h-px w-full bg-[#E5E5E5]" />
      <div className="flex flex-col">
        {["Direction 1", "Direction 2", "Direction 3"].map((folder) => (
          <button
            key={folder}
            type="button"
            className="inline-flex h-7 cursor-pointer items-center gap-2 rounded-[6px] px-2 py-[6px] text-[12px] font-medium leading-none text-[#262626] transition-colors hover:bg-[#F5F5F5]"
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
        className={`inline-flex h-8 items-center justify-center gap-2 rounded-[6px] border border-[rgba(158,153,248,0.75)] bg-gradient-to-b from-[#7B76DF] to-[#463FBA] py-2 pl-[10px] pr-3 text-[13px] font-medium leading-none text-[#FAFAFA] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-opacity ${
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
    <svg viewBox="0 0 16 16" aria-hidden="true" className="h-[15px] w-[10px] shrink-0">
      <path fill="#F24E1E" d="M5.5 8A2.5 2.5 0 0 1 8 5.5h2.5v5H8A2.5 2.5 0 0 1 5.5 8Z" />
      <path fill="#A259FF" d="M5.5 3A2.5 2.5 0 0 1 8 .5h2.5v5H8A2.5 2.5 0 0 1 5.5 3Z" />
      <path fill="#1ABCFE" d="M10.5 5.5H13A2.5 2.5 0 1 1 10.5 8V5.5Z" />
      <path fill="#0ACF83" d="M5.5 13A2.5 2.5 0 0 1 8 10.5h2.5V13A2.5 2.5 0 1 1 5.5 13Z" />
      <path fill="#FF7262" d="M10.5.5H13a2.5 2.5 0 0 1 0 5h-2.5v-5Z" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-[15px] w-[15px] shrink-0 text-[#525252]"
    >
      <path d="M2.5 5.2c0-.9.7-1.6 1.6-1.6h2l1.2 1.3h4.6c.9 0 1.6.7 1.6 1.6v4.4c0 .9-.7 1.6-1.6 1.6H4.1c-.9 0-1.6-.7-1.6-1.6V5.2Z" />
    </svg>
  );
}

function FolderUploadIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-5 w-5 shrink-0 text-[#525252]"
    >
      <path d="M3.3 7.1c0-1 .8-1.8 1.8-1.8h2.7L9.1 7h5.8c1 0 1.8.8 1.8 1.8v4.8c0 1-.8 1.8-1.8 1.8H5.1c-1 0-1.8-.8-1.8-1.8V7.1Z" />
      <path d="M10 13V9.5M8.4 11.1 10 9.5l1.6 1.6" />
    </svg>
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
