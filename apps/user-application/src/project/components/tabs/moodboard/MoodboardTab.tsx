import { useState } from "react";
import {
  moodboardImages,
  type MoodboardItem,
  type MoodboardMode,
} from "../../../data/fixtures/moodboardTabFixtures";
import type { Project } from "../../../models/project";
import { DirectionHub, type Direction } from "./DirectionHub";
import { DirectionToggle } from "./DirectionToggle";
import { FigmaLinkPanel } from "./FigmaLinkPanel";
import { FolderMenu } from "./FolderMenu";
import { Footer } from "./Footer";
import { Header } from "./Header";
import { ModeToggle } from "./ModeToggle";
import { MoodboardGrid } from "./MoodboardGrid";
import { StyleGuideGenerating } from "./StyleGuideGenerating";
import { StyleGuideView } from "./StyleGuideView";
import { DirectionIcon } from "./moodboardIcons";
import { UploadDropzone } from "./UploadDropzone";
import { UploadedFilesList } from "./UploadedFilesList";

type MoodboardView = "board" | "hub" | "generating-style-guide" | "style-guide";

export function MoodboardTab({ project: _project }: { project: Project }) {
  const [mode, setMode] = useState<MoodboardMode>("upload");
  const [hasUploadedFiles, setHasUploadedFiles] = useState(false);
  const [view, setView] = useState<MoodboardView>("board");
  const [items, setItems] = useState<MoodboardItem[]>(
    moodboardImages.map((image, index) => ({
      id: `reference-${index + 1}`,
      image,
      folder: index < 2 ? "Direction 1" : index < 4 ? "Direction 2" : "Direction 3",
      isInMoodboard: true,
    })),
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(["reference-1", "reference-2"]),
  );
  const [folders, setFolders] = useState<Direction[]>([
    { name: "Direction 1" },
    { name: "Direction 2", hasStyleGuide: true },
    { name: "Direction 3" },
  ]);
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [draftFolderName, setDraftFolderName] = useState("");
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [isFolderMenuOpen, setIsFolderMenuOpen] = useState(false);
  const [figmaLink, setFigmaLink] = useState("");

  const selectedItems = items.filter((item) => selectedIds.has(item.id));
  const hasMoodboard = items.some((item) => item.isInMoodboard);
  const folderNames = folders.map((folder) => folder.name);
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

  function openDirectionMenu() {
    setIsFolderMenuOpen((current) => !current);
  }

  function generateStyleGuide(direction: string) {
    setFolders((current) => current.map((item) =>
      item.name === direction ? { ...item, hasStyleGuide: true } : item,
    ));
    setView("generating-style-guide");
    window.setTimeout(() => setView("style-guide"), 900);
  }

  if (view === "generating-style-guide") {
    return <StyleGuideGenerating />;
  }

  if (view === "style-guide") {
    return (
      <StyleGuideView
        onBack={() => setView("hub")}
        onRegenerate={() => {
          setView("generating-style-guide");
          window.setTimeout(() => setView("style-guide"), 900);
        }}
      />
    );
  }

  return (
    <section className="flex w-full flex-col gap-1 rounded-[12px] bg-[#F5F5F5] p-1 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
      <Header />

      {view === "hub" ? (
        <DirectionHub
          directions={folders}
          items={items.filter((item) => item.isInMoodboard)}
          onAll={() => setView("board")}
          onNewDirection={() => {
            setView("board");
            setIsFolderMenuOpen(true);
            setIsCreatingFolder(true);
          }}
          onGenerateStyleGuide={generateStyleGuide}
        />
      ) : !showGrid ? (
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
              <DirectionToggle
                activeView="all"
                onAll={() => setActiveFolder(null)}
                onDirectionHub={() => setView("hub")}
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
                    onClick={openDirectionMenu}
                  >
                    Add to Direction
                    <DirectionIcon />
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
                folders={folderNames.length > 0 ? folderNames : ["Direction 1", "Direction 2", "Direction 3"]}
                creating={isCreatingFolder}
                draftName={draftFolderName}
                onSelectFolder={(folder) => {
                  setFolders((current) => current.some((item) => item.name === folder) ? current : [...current, { name: folder }]);
                  setItems((current) => current.map((item) =>
                    selectedIds.has(item.id) ? { ...item, folder, isInMoodboard: true } : item,
                  ));
                  setActiveFolder(null);
                  setIsCreatingFolder(false);
                  setDraftFolderName("");
                  setIsFolderMenuOpen(false);
                }}
                onCreateFolder={() => {
                  setIsCreatingFolder(true);
                  setDraftFolderName("");
                }}
                onDraftNameChange={setDraftFolderName}
                onCommitFolder={() => {
                  const name = draftFolderName.trim() || `Direction ${folders.length + 1}`;
                  setFolders((current) => current.some((item) => item.name === name) ? current : [...current, { name }]);
                  setItems((current) => current.map((item) =>
                    selectedIds.has(item.id) ? { ...item, folder: name, isInMoodboard: true } : item,
                  ));
                  setActiveFolder(null);
                  setDraftFolderName("");
                  setIsCreatingFolder(false);
                  setIsFolderMenuOpen(false);
                }}
              />
            ) : null}
          </div>
        </div>
      )}

      {view === "board" ? (
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
      ) : null}
    </section>
  );
}
