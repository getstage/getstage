import { useState } from "react";
import {
  moodboardImages,
  type MoodboardItem,
  type MoodboardMode,
} from "../../../data/fixtures/moodboardTabFixtures";
import type { Project } from "../../../models/project";
import { FigmaLinkPanel } from "./FigmaLinkPanel";
import { FolderMenu } from "./FolderMenu";
import { FolderTabs } from "./FolderTabs";
import { Footer } from "./Footer";
import { Header } from "./Header";
import { ModeToggle } from "./ModeToggle";
import { MoodboardGrid } from "./MoodboardGrid";
import { PlusIcon } from "./moodboardIcons";
import { UploadDropzone } from "./UploadDropzone";
import { UploadedFilesList } from "./UploadedFilesList";

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
