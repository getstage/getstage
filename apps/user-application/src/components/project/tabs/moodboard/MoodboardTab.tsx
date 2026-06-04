import { useEffect, useRef, useState } from "react";
import type { MoodboardUploadedFile } from "@stage/data-ops/contracts";
import { UpstreamStaleBanner } from "@/components/project/UpstreamStaleBanner";
import {
  defaultStyleGuide,
  type MoodboardItem,
  type MoodboardMode,
} from "@/data/fixtures/project/moodboardTabFixtures";
import { useMoodboardTab } from "@/hooks/project";
import { getStyleGuideForDirection } from "@/lib/project/mapMoodboardArtifactToTabData";
import type { Project } from "@/models/project/project";
import { DirectionHub, type Direction } from "./DirectionHub";
import { DirectionToggle } from "./DirectionToggle";
import { FigmaLinkPanel, GenerateWithAiButton, GenerateWithAiPanel } from "./FigmaLinkPanel";
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
  return [];
}

const LEGACY_AUTO_DIRECTION_NAMES = new Set(["Direction 1", "Direction 2", "Direction 3"]);

function isLegacyAutoDirection(name: string, usedDirectionNames: Set<string>, hasStyleGuide?: boolean) {
  return LEGACY_AUTO_DIRECTION_NAMES.has(name) && !usedDirectionNames.has(name) && !hasStyleGuide;
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
  const [uploadedFiles, setUploadedFiles] = useState<MoodboardUploadedFile[]>([]);
  const [view, setView] = useState<MoodboardView>("board");
  const [items, setItems] = useState<MoodboardItem[]>(createFallbackItems);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [folders, setFolders] = useState<Direction[]>([]);
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [draftFolderName, setDraftFolderName] = useState("");
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [isFolderMenuOpen, setIsFolderMenuOpen] = useState(false);
  const [figmaLink, setFigmaLink] = useState("");
  const [referoQuery, setReferoQuery] = useState("");
  const [activeStyleGuideDirectionName, setActiveStyleGuideDirectionName] = useState<string | null>(null);
  const [styleGuideGeneratingMode, setStyleGuideGeneratingMode] = useState<"generate" | "regenerate">("generate");
  const directionMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!moodboard.data?.tabData) {
      return;
    }

    const { tabData } = moodboard.data;
    setMode(
      tabData.importMode === "url" ? "figma" : (tabData.importMode ?? "upload"),
    );
    setHasUploadedFiles(tabData.uploadedFiles.length > 0);
    setHasFigmaImportResults(
      (tabData.importMode === "figma" ||
        tabData.importMode === "ai" ||
        tabData.importMode === "url") &&
        tabData.references.some((reference) => !reference.isInMoodboard),
    );
    setUploadedFiles(tabData.uploadedFiles);
    setItems(tabData.references);
    const usedDirectionNames = new Set(
      tabData.references
        .map((reference) => reference.folder)
        .filter((folder): folder is string => Boolean(folder)),
    );
    setFolders(
      tabData.directions
        .filter((direction) =>
          !isLegacyAutoDirection(direction.name, usedDirectionNames, direction.hasStyleGuide),
        )
        .map((direction) => ({
          name: direction.name,
          hasStyleGuide: direction.hasStyleGuide,
        })),
    );
    setSelectedIds((current) => {
      const next = new Set(
        [...current].filter((id) => tabData.references.some((reference) => reference.id === id)),
      );
      return next;
    });
  }, [moodboard.data]);

  const hasMoodboard = items.some((item) => item.isInMoodboard);
  const folderNames = folders.map((folder) => folder.name);
  const hasStagedItems = items.some((item) => !item.isInMoodboard);
  const showImportGrid = hasStagedItems && (mode === "figma" || mode === "ai" || mode === "upload");
  const showMoodboardGrid = hasMoodboard && !showImportGrid;
  const showGrid = showImportGrid || showMoodboardGrid;
  const visibleItems = items.filter((item) => {
    if (showImportGrid) return !item.isInMoodboard;
    if (!item.isInMoodboard) return false;
    return activeFolder ? item.folder === activeFolder : true;
  });
  const selectedVisibleItems = visibleItems.filter((item) => selectedIds.has(item.id));
  const selectedVisibleIds = new Set(selectedVisibleItems.map((item) => item.id));
  const canAddToMoodboard = selectedVisibleItems.length > 0;
  const showSelectionActions = (hasMoodboard || showImportGrid) && selectedVisibleItems.length > 0;
  const deleteButtonLabel = selectedVisibleItems.some((item) => item.isInMoodboard)
    ? "Delete from Moodboard"
    : "Delete selected";
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

  function persistBoard(nextItems: MoodboardItem[], nextFolders: Direction[], nextUploadedFiles = uploadedFiles) {
    void moodboard
      .saveBoard({
        mode,
        items: nextItems,
        directions: nextFolders,
        uploadedFiles: nextUploadedFiles,
      })
      .catch(() => {
        // Error is surfaced through moodboard.error; keep local board state intact.
      });
  }

  function closeDirectionMenu() {
    setIsFolderMenuOpen(false);
    setIsCreatingFolder(false);
    setDraftFolderName("");
  }

  function openDirectionMenu() {
    setIsFolderMenuOpen((current) => {
      if (current) {
        setIsCreatingFolder(false);
        setDraftFolderName("");
      }
      return !current;
    });
  }

  useEffect(() => {
    if (!isFolderMenuOpen) {
      return;
    }

    if (!showSelectionActions || view !== "board") {
      closeDirectionMenu();
    }
  }, [isFolderMenuOpen, showSelectionActions, view]);

  useEffect(() => {
    if (!isFolderMenuOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;
      if (target instanceof Node && directionMenuRef.current?.contains(target)) {
        return;
      }
      closeDirectionMenu();
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isFolderMenuOpen]);

  function renameDirection(previousName: string, nextName: string) {
    const name = nextName.trim();
    if (!name || name === previousName) return;
    if (folders.some((folder) => folder.name === name)) return;

    const nextFolders = folders.map((folder) =>
      folder.name === previousName ? { ...folder, name } : folder,
    );
    const nextItems = items.map((item) =>
      item.folder === previousName ? { ...item, folder: name } : item,
    );

    setFolders(nextFolders);
    setItems(nextItems);
    setActiveFolder((current) => (current === previousName ? name : current));
    setActiveStyleGuideDirectionName((current) => (current === previousName ? name : current));
    persistBoard(nextItems, nextFolders);
  }

  async function handleUpload(files: FileList) {
    try {
      const uploaded = await moodboard.uploadFiles(files);
      const nextItems = [...items, ...uploaded.items];
      const nextUploadedFiles = [...uploadedFiles, ...uploaded.uploadedFiles];
      setItems(nextItems);
      setUploadedFiles(nextUploadedFiles);
      setHasUploadedFiles(nextUploadedFiles.length > 0);
      setSelectedIds(new Set(uploaded.items.map((item) => item.id)));
      persistBoard(nextItems, folders, nextUploadedFiles);
    } catch {
      // Error is surfaced through moodboard.error.
    }
  }

  async function handleFigmaImport() {
    try {
      setMode("figma");
      await moodboard.importFigmaLink(figmaLink);
      setHasFigmaImportResults(true);
    } catch {
      // Error is surfaced through moodboard.error.
    }
  }

  async function handleGenerateWithAi() {
    try {
      setMode("ai");
      await moodboard.generateWithAi(referoQuery);
      setHasFigmaImportResults(true);
    } catch {
      // Error is surfaced through moodboard.error.
    }
  }

  async function generateStyleGuide(direction: string) {
    setActiveStyleGuideDirectionName(direction);
    setFolders((current) => current.map((item) =>
      item.name === direction ? { ...item, hasStyleGuide: true } : item,
    ));
    setStyleGuideGeneratingMode("generate");
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
    return <StyleGuideGenerating mode={styleGuideGeneratingMode} />;
  }

  if (view === "style-guide") {
    return (
        <StyleGuideView
          styleGuide={activeStyleGuide}
          onBack={() => setView("hub")}
          onRegenerate={() => {
            setStyleGuideGeneratingMode("regenerate");
            setView("generating-style-guide");
            window.setTimeout(() => setView("style-guide"), 900);
          }}
        />
      );
  }

  if (mode === "ai" && moodboard.isImporting) {
    return <MoodboardGeneratingState />;
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
          onRenameDirection={renameDirection}
          onGenerateStyleGuide={generateStyleGuide}
        />
      ) : !showGrid ? (
        <div className="flex min-h-[420px] flex-1 items-center justify-center rounded-[8px] bg-white p-[clamp(24px,4.3vw,44px)] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
          <div className="flex w-full max-w-[611px] flex-col items-start gap-6">
            {mode === "figma" || mode === "ai" ? (
              <div className="flex w-full flex-col gap-6">
                <div className="flex flex-wrap items-start gap-[6px]">
                  <ModeToggle mode={mode} onModeChange={setMode} />
                  <GenerateWithAiButton
                    disabled={moodboard.isImporting}
                    onClick={() => setMode("ai")}
                  />
                </div>
                {mode === "ai" ? (
                  <GenerateWithAiPanel
                    compact={false}
                    disabled={moodboard.isImporting}
                    value={referoQuery}
                    onChange={setReferoQuery}
                    onSubmit={handleGenerateWithAi}
                  />
                ) : (
                  <FigmaLinkPanel
                    compact={false}
                    disabled={moodboard.isImporting}
                    value={figmaLink}
                    onChange={setFigmaLink}
                    onSubmit={handleFigmaImport}
                  />
                )}
              </div>
            ) : (
              <div className="flex flex-wrap items-start gap-[6px]">
                <ModeToggle mode={mode} onModeChange={setMode} />
                <GenerateWithAiButton
                  disabled={moodboard.isImporting}
                  onClick={() => setMode("ai")}
                />
              </div>
            )}
            {mode === "upload" ? (
              <div className="flex w-full flex-col gap-3">
                <UploadDropzone
                  accept={moodboard.acceptUploads}
                  disabled={moodboard.isUploading}
                  onUpload={handleUpload}
                />
                {hasUploadedFiles ? <UploadedFilesList files={uploadedFiles} /> : null}
              </div>
            ) : null}
            {moodboard.error ? (
              <p className="text-[12px] font-medium leading-[1.25] text-[#EF4444]">
                {moodboard.error}
              </p>
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
                  disabled={moodboard.isImporting}
                  onClick={() => setMode("ai")}
                />
              </div>
              {mode === "ai" ? (
                <GenerateWithAiPanel
                  compact
                  disabled={moodboard.isImporting}
                  value={referoQuery}
                  onChange={setReferoQuery}
                  onSubmit={handleGenerateWithAi}
                />
              ) : (
                <FigmaLinkPanel
                  compact
                  disabled={moodboard.isImporting}
                  value={figmaLink}
                  onChange={setFigmaLink}
                  onSubmit={handleFigmaImport}
                />
              )}
              {moodboard.error ? (
                <p className="text-[12px] font-medium leading-[1.25] text-[#EF4444]">
                  {moodboard.error}
                </p>
              ) : null}
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
                <div
                  ref={directionMenuRef}
                  className="relative flex items-center justify-end gap-2"
                >
                  <button
                    type="button"
                    className="inline-flex h-8 cursor-pointer items-center justify-center rounded-[6px] bg-white px-3 text-[12px] font-medium leading-none text-[#EF4444] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#FAFAFA]"
                    onClick={() => {
                      if (selectedVisibleIds.size === 0) return;
                      const nextItems = items.flatMap((item) => {
                        if (!selectedVisibleIds.has(item.id)) {
                          return [item];
                        }

                        if (item.isInMoodboard) {
                          return [{ ...item, isInMoodboard: false, folder: null }];
                        }

                        return [];
                      });
                      setItems(nextItems);
                      setSelectedIds(new Set());
                      closeDirectionMenu();
                      persistBoard(nextItems, folders);
                    }}
                  >
                    {deleteButtonLabel}
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-8 cursor-pointer items-center justify-center gap-2 rounded-[6px] border border-[#525252] bg-gradient-to-b from-[#404040] to-[#0A0A0A] py-2 pl-3 pr-[10px] text-[13px] font-medium leading-none text-[#FAFAFA] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-opacity hover:opacity-95"
                    onClick={openDirectionMenu}
                  >
                    Add to Direction
                    <DirectionIcon />
                  </button>
                  {isFolderMenuOpen ? (
                    <FolderMenu
                      folders={folderNames}
                      creating={isCreatingFolder}
                      draftName={draftFolderName}
                      onSelectFolder={(folder) => {
                        const nextFolders = folders.some((item) => item.name === folder)
                          ? folders
                          : [...folders, { name: folder }];
                        const nextItems = items.map((item) =>
                          selectedVisibleIds.has(item.id) ? { ...item, folder, isInMoodboard: true } : item,
                        );
                        setFolders(nextFolders);
                        setItems(nextItems);
                        setActiveFolder(null);
                        closeDirectionMenu();
                        persistBoard(nextItems, nextFolders);
                      }}
                      onCreateFolder={() => {
                        setIsCreatingFolder(true);
                        setDraftFolderName("");
                      }}
                      onDraftNameChange={setDraftFolderName}
                      onCommitFolder={() => {
                        const name = draftFolderName.trim();
                        if (!name) return;
                        const nextFolders = folders.some((item) => item.name === name)
                          ? folders
                          : [...folders, { name }];
                        const nextItems = items.map((item) =>
                          selectedVisibleIds.has(item.id) ? { ...item, folder: name, isInMoodboard: true } : item,
                        );
                        setFolders(nextFolders);
                        setItems(nextItems);
                        setActiveFolder(null);
                        closeDirectionMenu();
                        persistBoard(nextItems, nextFolders);
                      }}
                    />
                  ) : null}
                </div>
              ) : null}
            </div>

            <MoodboardGrid
              items={visibleItems}
              selectedIds={selectedIds}
              onToggleSelect={(itemId) => {
                closeDirectionMenu();
                setSelectedIds((current) => {
                  const next = new Set(current);
                  if (next.has(itemId)) next.delete(itemId);
                  else next.add(itemId);
                  return next;
                });
              }}
            />
          </div>
        </div>
      )}

      {view === "board" ? (
        <Footer
          hasMoodboard={hasMoodboard}
          canAddToMoodboard={canAddToMoodboard}
          onAddToMoodboard={() => {
            if (!canAddToMoodboard) return;
            const nextItems = items.map((item) =>
              selectedVisibleIds.has(item.id) ? { ...item, isInMoodboard: true } : item,
            );
            setItems(nextItems);
            setSelectedIds(new Set());
            setHasFigmaImportResults(false);
            persistBoard(nextItems, folders);
          }}
        />
      ) : null}
      </section>
    </>
  );
}

function MoodboardGeneratingState() {
  return (
    <section className="rounded-[12px] bg-[#F5F5F5] p-1 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
      <div className="rounded-[8px] bg-white px-[44px] py-[44px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
        <div className="flex min-h-[520px] items-center justify-center">
          <div className="flex w-full max-w-[282px] flex-col items-center gap-6">
            <img
              src="/logos/dashboard/moodboard.svg"
              alt=""
              aria-hidden="true"
              className="h-[37px] w-[37px]"
            />

            <div className="flex w-full flex-col items-center gap-2">
              <p className="text-center text-[16px] font-semibold leading-none text-[#171717]">
                Generating Moodboard
              </p>
              <p className="text-center text-[13px] font-medium leading-[1.5] text-[#525252]">
                Finding visual references that match your search and preparing them for review.
              </p>
            </div>

            <div className="flex w-full flex-col items-center gap-2">
              <MoodboardLoadingStep icon="/logos/check.svg" label="Search query prepared" />
              <MoodboardLoadingStep icon="/logos/check.svg" label="Refero search started" />
              <MoodboardLoadingStep
                icon="/logos/loader.svg"
                label="Collecting visual references"
                spinning
              />
              <MoodboardLoadingStep icon="/logos/unchecked.svg" label="Preparing moodboard" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function MoodboardLoadingStep({
  icon,
  label,
  spinning = false,
}: {
  icon: string;
  label: string;
  spinning?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <img
        src={icon}
        alt=""
        aria-hidden="true"
        className={spinning ? "h-[16px] w-[16px] shrink-0 animate-spin" : "h-[18px] w-[18px] shrink-0"}
      />
      <p className="text-center text-[13px] font-medium leading-[1.5] text-[#525252]">
        {label}
      </p>
    </div>
  );
}
