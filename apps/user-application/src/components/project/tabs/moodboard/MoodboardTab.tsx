import { useEffect, useState } from "react";
import { UpstreamStaleBanner } from "@/components/project/UpstreamStaleBanner";
import {
  createDefaultSelectedReferenceIds,
  createSeedDirections,
  createSeedReferences,
  defaultStyleGuide,
  MOODBOARD_DIRECTION_NAMES,
  type MoodboardItem,
  type MoodboardMode,
} from "@/data/fixtures/project/moodboardTabFixtures";
import { useMoodboardTab } from "@/hooks/project";
import { getStyleGuideForDirection } from "@/lib/project/mapMoodboardArtifactToTabData";
import type { Project } from "@/models/project/project";
import { DirectionHub, type Direction } from "./DirectionHub";
import { DirectionToggle } from "./DirectionToggle";
import { FigmaLinkPanel, GenerateWithAiButton } from "./FigmaLinkPanel";
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

function createFallbackItems(): MoodboardItem[] {
  return createSeedReferences();
}

function createFallbackDirections() {
  return createSeedDirections();
}

type MoodboardTabProps = {
  project: Project;
  onGoToResearch?: () => void;
  onGoToStrategy?: () => void;
};

export function MoodboardTab({ project, onGoToResearch, onGoToStrategy }: MoodboardTabProps) {
  const moodboard = useMoodboardTab({ id: project.id, name: project.name });
  const [mode, setMode] = useState<MoodboardMode>("upload");
  const [hasUploadedFiles, setHasUploadedFiles] = useState(false);
  const [hasFigmaImportResults, setHasFigmaImportResults] = useState(false);
  const [view, setView] = useState<MoodboardView>("board");
  const [items, setItems] = useState<MoodboardItem[]>(createFallbackItems);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(createDefaultSelectedReferenceIds);
  const [folders, setFolders] = useState<Direction[]>(createFallbackDirections);
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [draftFolderName, setDraftFolderName] = useState("");
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [isFolderMenuOpen, setIsFolderMenuOpen] = useState(false);
  const [figmaLink, setFigmaLink] = useState("");
  const [activeStyleGuideDirectionName, setActiveStyleGuideDirectionName] = useState<string | null>(null);

  useEffect(() => {
    if (!moodboard.data?.tabData) {
      return;
    }

    const { tabData } = moodboard.data;
    setMode(tabData.importMode ?? "upload");
    setHasUploadedFiles(tabData.uploadedFiles.length > 0);
    setHasFigmaImportResults(tabData.importMode === "figma" && tabData.references.length > 0);
    setItems(tabData.references);
    setFolders(
      tabData.directions.map((direction) => ({
        name: direction.name,
        hasStyleGuide: direction.hasStyleGuide,
      })),
    );
    setSelectedIds((current) => {
      const next = new Set(
        [...current].filter((id) => tabData.references.some((reference) => reference.id === id)),
      );
      return next.size > 0 ? next : new Set(tabData.references.slice(0, 2).map((reference) => reference.id));
    });
  }, [moodboard.data]);

  const selectedItems = items.filter((item) => selectedIds.has(item.id));
  const hasMoodboard = items.some((item) => item.isInMoodboard);
  const folderNames = folders.map((folder) => folder.name);
  const showFigmaImportGrid = mode === "figma" && hasFigmaImportResults;
  const showMoodboardGrid = hasMoodboard && !showFigmaImportGrid;
  const showGrid = showFigmaImportGrid || showMoodboardGrid;
  const visibleItems = items.filter((item) => {
    if (showFigmaImportGrid) return true;
    if (!item.isInMoodboard) return false;
    return activeFolder ? item.folder === activeFolder : true;
  });
  const canAddToMoodboard = mode === "figma" ? selectedItems.length > 0 : hasUploadedFiles;
  const showSelectionActions = (hasMoodboard || showFigmaImportGrid) && selectedItems.length > 0;
  const activeStyleGuide = (() => {
    if (!activeStyleGuideDirectionName || !moodboard.data) {
      return defaultStyleGuide;
    }

    const directionId = moodboard.data.tabData.directions.find(
      (direction) => direction.name === activeStyleGuideDirectionName,
    )?.id;

    if (!directionId) {
      return defaultStyleGuide;
    }

    return getStyleGuideForDirection(moodboard.data.tabData, directionId) ?? defaultStyleGuide;
  })();

  function selectDefaultReferences() {
    setSelectedIds(createDefaultSelectedReferenceIds());
  }

  function openDirectionMenu() {
    setIsFolderMenuOpen((current) => !current);
  }

  async function generateStyleGuide(direction: string) {
    setActiveStyleGuideDirectionName(direction);
    setFolders((current) => current.map((item) =>
      item.name === direction ? { ...item, hasStyleGuide: true } : item,
    ));
    setView("generating-style-guide");

    const directionId = moodboard.data?.tabData.directions.find((item) => item.name === direction)?.id;

    if (directionId) {
      try {
        await moodboard.generateStyleGuide(directionId);
      } catch {
        // Keep the existing mock UI flow even if generation is unavailable.
      }
      setView("style-guide");
      return;
    }

    window.setTimeout(() => setView("style-guide"), 900);
  }

  if (view === "generating-style-guide") {
    return <StyleGuideGenerating />;
  }

  if (view === "style-guide") {
    return (
        <StyleGuideView
          styleGuide={activeStyleGuide}
          onBack={() => setView("hub")}
          onRegenerate={() => {
            setView("generating-style-guide");
            window.setTimeout(() => setView("style-guide"), 900);
          }}
        />
      );
  }

  return (
    <>
      <UpstreamStaleBanner
        projectId={project.id}
        onGoToResearch={onGoToResearch}
        onGoToStrategy={onGoToStrategy}
      />
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
            {mode === "figma" ? (
              <div className="flex w-full flex-col gap-6">
                <div className="flex flex-wrap items-start gap-[6px]">
                  <ModeToggle mode={mode} onModeChange={setMode} />
                  <GenerateWithAiButton
                    onClick={() => {
                      setHasFigmaImportResults(true);
                      selectDefaultReferences();
                    }}
                  />
                </div>
                <FigmaLinkPanel
                  compact={false}
                  value={figmaLink}
                  onChange={setFigmaLink}
                  onSubmit={() => {
                    setHasFigmaImportResults(true);
                    selectDefaultReferences();
                  }}
                />
              </div>
            ) : (
              <ModeToggle mode={mode} onModeChange={setMode} />
            )}
            {mode === "upload" ? (
              <div className="flex w-full flex-col gap-3">
                <UploadDropzone onUpload={() => setHasUploadedFiles(true)} />
                {hasUploadedFiles ? <UploadedFilesList /> : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="rounded-[8px] bg-white p-4 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
            <div className="flex flex-col gap-6">
              <div className="flex flex-wrap items-start gap-[6px]">
                <ModeToggle mode={mode} onModeChange={setMode} />
                <GenerateWithAiButton
                  onClick={() => {
                    setHasFigmaImportResults(true);
                    selectDefaultReferences();
                  }}
                />
              </div>
              <FigmaLinkPanel
                compact
                value={figmaLink}
                onChange={setFigmaLink}
                onSubmit={() => {
                  setHasFigmaImportResults(true);
                  selectDefaultReferences();
                }}
              />
            </div>
          </div>

          <div className="relative flex flex-col gap-2 rounded-[10px] bg-white p-4 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
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
                    className="inline-flex h-8 cursor-pointer items-center justify-center rounded-[6px] bg-white px-3 text-[12px] font-medium leading-none text-[#EF4444] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#FAFAFA]"
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
                    className="inline-flex h-8 cursor-pointer items-center justify-center gap-2 rounded-[6px] border border-[#525252] bg-gradient-to-b from-[#404040] to-[#0A0A0A] py-2 pl-3 pr-[10px] text-[13px] font-medium leading-none text-[#FAFAFA] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-opacity hover:opacity-95"
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
                folders={folderNames.length > 0 ? folderNames : [...MOODBOARD_DIRECTION_NAMES]}
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
              setHasFigmaImportResults(true);
              selectDefaultReferences();
            }
            setItems((current) => current.map((item) =>
              selectedIds.has(item.id) || mode === "upload" ? { ...item, isInMoodboard: true } : item,
            ));
          }}
        />
      ) : null}
      </section>
    </>
  );
}
