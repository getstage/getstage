import { useEffect, useRef, useState } from "react";
import type { MoodboardStyleGuide, MoodboardUploadedFile, ProviderId } from "@stage/data-ops/contracts";
import { GenerateStrategyRunDialog } from "@/components/project/GenerateStrategyRunDialog";
import { UpstreamStaleBanner } from "@/components/project/UpstreamStaleBanner";
import {
  defaultStyleGuide,
  type MoodboardItem,
  type MoodboardMode,
} from "@/data/fixtures/project/moodboardTabFixtures";
import { useMoodboardTab } from "@/hooks/project";
import { getStyleGuideForDirection } from "@/lib/project/mapMoodboardArtifactToTabData";
import { directionIdFromName } from "@/lib/project/moodboardBoardState";
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
  onGoToFlows: () => void;
};

export function MoodboardTab({ project, onGoToResearch, onGoToStrategy, onGoToFlows }: MoodboardTabProps) {
  const moodboard = useMoodboardTab({ id: project.id, name: project.name });
  const [mode, setMode] = useState<MoodboardMode>("upload");
  const [hasUploadedFiles, setHasUploadedFiles] = useState(false);
  const [hasFigmaImportResults, setHasFigmaImportResults] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<MoodboardUploadedFile[]>([]);
  const [view, setView] = useState<MoodboardView>("board");
  const [items, setItems] = useState<MoodboardItem[]>(createFallbackItems);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [folders, setFolders] = useState<Direction[]>([]);
  const [activeFolder, setActiveFolder] = useState<string>();
  const [draftFolderName, setDraftFolderName] = useState("");
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [isFolderMenuOpen, setIsFolderMenuOpen] = useState(false);
  const [figmaLink, setFigmaLink] = useState("");
  const [referoQuery, setReferoQuery] = useState("");
  const [activeStyleGuideDirectionName, setActiveStyleGuideDirectionName] = useState<string>();
  const [styleGuideDialogDirection, setStyleGuideDialogDirection] = useState<string>();
  const [styleGuideGeneratingMode, setStyleGuideGeneratingMode] = useState<"generate" | "regenerate">("generate");
  const [isEditingStyleGuide, setIsEditingStyleGuide] = useState(false);
  const [newDirectionName, setNewDirectionName] = useState<string>();
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
    // Derive hasStyleGuide from the styleGuides array (single source of truth) rather
    // than the stored direction flag, which drifts and gets stuck on "View".
    const styleGuideDirectionIds = new Set(
      tabData.styleGuides.map((styleGuide) => styleGuide.directionId),
    );
    const directionHasStyleGuide = (name: string) =>
      styleGuideDirectionIds.has(directionIdFromName(name));
    setFolders(
      tabData.directions
        .filter((direction) =>
          !isLegacyAutoDirection(direction.name, usedDirectionNames, directionHasStyleGuide(direction.name)),
        )
        .map((direction) => ({
          name: direction.name,
          hasStyleGuide: directionHasStyleGuide(direction.name),
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
  // Uploaded-file rows can preview/open their image by borrowing the board item that
  // shares the same uploaded asset (PDFs have no item, so previewUrl stays undefined).
  const uploadedFilesWithPreview = uploadedFiles.map((file) => ({
    ...file,
    previewUrl: items.find(
      (item) => Boolean(item.uploadedAssetId) && item.uploadedAssetId === file.uploadedAssetId,
    )?.image,
  }));
  const showGrid = items.length > 0;
  // The All grid shows moodboard images and newly-staged candidates together: staged
  // items are always visible (badged in the grid), moodboard items honour the active
  // direction filter. Staging a new image no longer hides what's already saved.
  const visibleItems = items.filter((item) => {
    if (!item.isInMoodboard) {
      return true;
    }
    return activeFolder ? item.folder === activeFolder : true;
  });
  const selectedVisibleItems = visibleItems.filter((item) => selectedIds.has(item.id));
  const selectedVisibleIds = new Set(selectedVisibleItems.map((item) => item.id));
  const selectedStagedItems = selectedVisibleItems.filter((item) => !item.isInMoodboard);
  const canAddToMoodboard = selectedStagedItems.length > 0;
  const showSelectionActions = selectedVisibleItems.length > 0;
  const canRemoveFromActiveDirection =
    Boolean(activeFolder) &&
    selectedVisibleItems.length > 0 &&
    selectedVisibleItems.every((item) => item.isInMoodboard && item.folder === activeFolder);
  const deleteButtonLabel = canRemoveFromActiveDirection ? "Remove from Direction" : "Delete selected";
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

  // Restore the style-guide generating screen after a tab remount: the durable "running"
  // styleguide run carries the directionId, so we re-open generating for that direction.
  useEffect(() => {
    const directionId = moodboard.runningStyleGuideDirectionId;
    if (!directionId || !moodboard.data) {
      return;
    }
    const name = moodboard.data.tabData.directions.find(
      (direction) => direction.id === directionId,
    )?.name;
    if (!name) {
      return;
    }
    setActiveStyleGuideDirectionName(name);
    setView("generating-style-guide");
  }, [moodboard.runningStyleGuideDirectionId, moodboard.data]);

  useEffect(() => {
    if (view !== "generating-style-guide" || !activeStyleGuideDirectionName) {
      return;
    }
    const directionId = moodboard.data?.tabData.directions.find(
      (direction) => direction.name === activeStyleGuideDirectionName,
    )?.id;
    const hasSavedGuide =
      directionId && moodboard.data
        ? Boolean(getStyleGuideForDirection(moodboard.data.tabData, directionId))
        : false;
    // Warm path: the terminal event set styleGuideCompletedAt. Remount/cold path: the
    // durable run is no longer "running" and the direction now has a saved style guide.
    const completed =
      moodboard.styleGuideCompletedAt !== undefined ||
      (!moodboard.isGeneratingStyleGuide && hasSavedGuide);
    if (completed) {
      setView("style-guide");
    }
  }, [
    activeStyleGuideDirectionName,
    moodboard.styleGuideCompletedAt,
    moodboard.isGeneratingStyleGuide,
    moodboard.data,
    view,
  ]);

  function persistBoard(
    nextItems: MoodboardItem[],
    nextFolders: Direction[],
    nextUploadedFiles = uploadedFiles,
    nextStyleGuides?: MoodboardStyleGuide[],
  ) {
    void moodboard
      .saveBoard({
        mode,
        items: nextItems,
        directions: nextFolders,
        uploadedFiles: nextUploadedFiles,
        styleGuides: nextStyleGuides,
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
    const previousDirectionId = directionIdFromName(previousName);
    const nextDirectionId = directionIdFromName(name);
    const nextStyleGuides = moodboard.data?.tabData.styleGuides.map((guide) =>
      guide.directionId === previousDirectionId ? { ...guide, directionId: nextDirectionId } : guide,
    );

    setFolders(nextFolders);
    setItems(nextItems);
    setActiveFolder((current) => (current === previousName ? name : current));
    setActiveStyleGuideDirectionName((current) => (current === previousName ? name : current));
    setNewDirectionName(undefined);
    persistBoard(nextItems, nextFolders, uploadedFiles, nextStyleGuides);
  }

  function deleteDirection(name: string) {
    if (!window.confirm(`Delete "${name}"? Images will stay in All. Its Style Guide will be removed.`)) return;

    const nextFolders = folders.filter((folder) => folder.name !== name);
    const nextItems = items.map((item) =>
      item.folder === name ? { ...item, folder: null, directionId: null } : item,
    );
    const removedDirectionId = directionIdFromName(name);
    const nextStyleGuides = moodboard.data?.tabData.styleGuides.filter(
      (guide) => guide.directionId !== removedDirectionId,
    );

    setFolders(nextFolders);
    setItems(nextItems);
    setActiveFolder((current) => (current === name ? undefined : current));
    setActiveStyleGuideDirectionName((current) => (current === name ? undefined : current));
    setNewDirectionName(undefined);
    persistBoard(nextItems, nextFolders, uploadedFiles, nextStyleGuides);
  }

  // Create an empty direction in place and keep the user in the Direction Hub (the card
  // opens in name-edit mode). Previously this jumped back to the board/upload screen.
  function createNewDirection() {
    const base = "New Direction";
    let name = base;
    let counter = 2;
    while (folders.some((folder) => folder.name === name)) {
      name = `${base} ${counter}`;
      counter += 1;
    }
    const nextFolders = [...folders, { name }];
    setFolders(nextFolders);
    setNewDirectionName(name);
    persistBoard(items, nextFolders);
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

  function deleteUploadedFile(fileId: string) {
    const file = uploadedFiles.find((item) => item.id === fileId);
    if (!file) return;

    const nextUploadedFiles = uploadedFiles.filter((item) => item.id !== fileId);
    const nextItems = items.filter(
      (item) =>
        item.id !== fileId &&
        (!file.uploadedAssetId || item.uploadedAssetId !== file.uploadedAssetId),
    );

    setUploadedFiles(nextUploadedFiles);
    setHasUploadedFiles(nextUploadedFiles.length > 0);
    setItems(nextItems);
    setSelectedIds((current) => new Set([...current].filter((id) => nextItems.some((item) => item.id === id))));
    persistBoard(nextItems, folders, nextUploadedFiles);
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

  // "View Style Guide" (a guide already exists) opens the saved guide directly and
  // starts no run. "Generate Style Guide" (no guide yet) opens the provider popup.
  function handleDirectionStyleGuide(direction: string) {
    const folder = folders.find((entry) => entry.name === direction);
    if (folder?.hasStyleGuide) {
      setActiveStyleGuideDirectionName(direction);
      setView("style-guide");
      return;
    }
    setStyleGuideDialogDirection(direction);
  }

  async function runStyleGuide(direction: string, providerId: ProviderId) {
    setActiveStyleGuideDirectionName(direction);
    setStyleGuideGeneratingMode("generate");
    setView("generating-style-guide");

    const directionId = moodboard.data?.tabData.directions.find((item) => item.name === direction)?.id;
    if (!directionId) {
      setView("hub");
      return;
    }

    try {
      await moodboard.generateStyleGuide(directionId, providerId);
    } catch {
      setView("hub");
    }
  }

  // Show the generating screen straight from the durable run too, so a remount doesn't
  // flash the board for a frame before the restore effect sets `view`.
  const generatingPreviewUrl = (() => {
    if (!activeStyleGuideDirectionName || !moodboard.data) {
      return undefined;
    }
    const directionId = moodboard.data.tabData.directions.find(
      (direction) => direction.name === activeStyleGuideDirectionName,
    )?.id;
    if (!directionId) {
      return undefined;
    }
    const firstRef = moodboard.data.tabData.references.find(
      (reference) => reference.directionId === directionId && reference.isInMoodboard,
    );
    return firstRef?.thumbnailUrl ?? firstRef?.imageUrl ?? firstRef?.image;
  })();

  // Only restore the generating screen from a durable run when its direction still exists —
  // a deleted direction would otherwise show an orphaned generating state until the run ends.
  const runningDirectionStillExists =
    moodboard.runningStyleGuideDirectionId !== undefined &&
    (moodboard.data?.tabData.directions.some(
      (direction) => direction.id === moodboard.runningStyleGuideDirectionId,
    ) ??
      false);

  if (view === "generating-style-guide" || runningDirectionStillExists) {
    return <StyleGuideGenerating mode={styleGuideGeneratingMode} previewUrl={generatingPreviewUrl} />;
  }

  if (view === "style-guide") {
    return (
        <StyleGuideView
          styleGuide={activeStyleGuide}
          isEditing={isEditingStyleGuide}
          onEdit={() => setIsEditingStyleGuide(true)}
          onSave={(editedGuide) => {
            const directionId = moodboard.data?.tabData.directions.find(
              (item) => item.name === activeStyleGuideDirectionName,
            )?.id;
            if (!directionId) {
              return;
            }
            void moodboard
              .saveStyleGuide(directionId, editedGuide, {
                mode,
                items,
                directions: folders,
                uploadedFiles,
              })
              .then(() => setIsEditingStyleGuide(false))
              .catch(() => {
                // Error is surfaced through moodboard.error.
              });
          }}
          onCancel={() => setIsEditingStyleGuide(false)}
          onBack={() => setView("hub")}
          onRegenerate={() => {
            const directionId = moodboard.data?.tabData.directions.find(
              (item) => item.name === activeStyleGuideDirectionName,
            )?.id;
            if (!directionId) {
              return;
            }
            setIsEditingStyleGuide(false);
            setStyleGuideGeneratingMode("regenerate");
            setView("generating-style-guide");
            void moodboard.regenerateStyleGuide(directionId).catch(() => {
              setView("style-guide");
            });
          }}
        />
      );
  }

  if (moodboard.isImporting) {
    return <MoodboardGeneratingState mode={moodboard.generatingMode} />;
  }

  // Until the artifact and run queries resolve we don't know if an import is in
  // flight, so hold instead of flashing the setup screen (tri-state: loading ≠ empty).
  if (moodboard.isLoading) {
    return null;
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
          editingDirectionName={newDirectionName}
          onAll={() => setView("board")}
          onOpenDirection={(name) => {
            setActiveFolder(name);
            setSelectedIds(new Set());
            setView("board");
          }}
          onNewDirection={createNewDirection}
          onRenameDirection={renameDirection}
          onDeleteDirection={deleteDirection}
          onGenerateStyleGuide={handleDirectionStyleGuide}
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
                    loading={moodboard.isImporting}
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
                {hasUploadedFiles ? <UploadedFilesList files={uploadedFilesWithPreview} onDelete={deleteUploadedFile} /> : null}
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
              {mode === "upload" ? (
                <div className="mx-auto flex w-full max-w-[496px] flex-col gap-3">
                  <UploadDropzone
                    accept={moodboard.acceptUploads}
                    disabled={moodboard.isUploading}
                    onUpload={handleUpload}
                  />
                  {hasUploadedFiles ? <UploadedFilesList files={uploadedFilesWithPreview} onDelete={deleteUploadedFile} /> : null}
                </div>
              ) : mode === "ai" ? (
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
                  loading={moodboard.isImporting}
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
              <div className="flex flex-wrap items-center gap-2">
                <DirectionToggle
                  activeView="all"
                  onAll={() => setActiveFolder(undefined)}
                  onDirectionHub={() => setView("hub")}
                />
                {activeFolder ? (
                  <ActiveDirectionBar
                    name={activeFolder}
                    onRename={(next) => renameDirection(activeFolder, next)}
                    onDelete={() => deleteDirection(activeFolder)}
                  />
                ) : null}
              </div>

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
                      if (canRemoveFromActiveDirection) {
                        const nextItems = items.map((item) =>
                          selectedVisibleIds.has(item.id)
                            ? { ...item, folder: null, directionId: null }
                            : item,
                        );
                        setItems(nextItems);
                        setSelectedIds(new Set());
                        closeDirectionMenu();
                        persistBoard(nextItems, folders);
                        return;
                      }
                      const removedAssetIds = new Set(
                        selectedVisibleItems
                          .map((item) => item.uploadedAssetId)
                          .filter((id): id is string => Boolean(id)),
                      );
                      const nextItems = items.filter((item) => !selectedVisibleIds.has(item.id));
                      const nextUploadedFiles = uploadedFiles.filter(
                        (file) =>
                          !selectedVisibleIds.has(file.id) &&
                          (!file.uploadedAssetId || !removedAssetIds.has(file.uploadedAssetId)),
                      );
                      setUploadedFiles(nextUploadedFiles);
                      setHasUploadedFiles(nextUploadedFiles.length > 0);
                      setItems(nextItems);
                      setSelectedIds(new Set());
                      closeDirectionMenu();
                      persistBoard(nextItems, folders, nextUploadedFiles);
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
                        setActiveFolder(undefined);
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
                        setActiveFolder(undefined);
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
          onGoToFlows={onGoToFlows}
        />
      ) : null}
      </section>

      <GenerateStrategyRunDialog
        open={styleGuideDialogDirection !== undefined}
        onOpenChange={(open) => {
          if (!open) {
            setStyleGuideDialogDirection(undefined);
          }
        }}
        title="Generate Style Guide"
        description="Turn this direction into a style guide. Choose a provider, then start the run."
        confirmLabel="Generate Style Guide"
        isSubmitting={moodboard.isGeneratingStyleGuide}
        providerOptions={moodboard.providerOptions}
        selectedProviderId={moodboard.selectedProviderId}
        onSelectProvider={moodboard.selectProvider}
        onConfirm={(providerId) => {
          const direction = styleGuideDialogDirection;
          setStyleGuideDialogDirection(undefined);
          if (direction) {
            void runStyleGuide(direction, providerId);
          }
        }}
      />
    </>
  );
}

// Shown in the board header when viewing a single direction, so its name is visible
// and editable in place (people otherwise lose track of which direction they opened).
function ActiveDirectionBar({
  name,
  onRename,
  onDelete,
}: {
  name: string;
  onRename: (nextName: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(name);

  useEffect(() => {
    setDraftName(name);
    setEditing(false);
  }, [name]);

  function commitRename() {
    const nextName = draftName.trim();
    if (!nextName || nextName === name) {
      setDraftName(name);
      setEditing(false);
      return;
    }
    onRename(nextName);
    setEditing(false);
  }

  return (
    <div className="flex items-center gap-2">
      {editing ? (
        <input
          value={draftName}
          onChange={(event) => setDraftName(event.target.value)}
          onBlur={commitRename}
          onKeyDown={(event) => {
            if (event.key === "Enter") commitRename();
            if (event.key === "Escape") {
              setDraftName(name);
              setEditing(false);
            }
          }}
          autoFocus
          className="h-[27px] w-[180px] min-w-0 rounded-[6px] bg-white px-2 text-[14px] font-semibold leading-[1.25] text-[#171717] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] outline-none"
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            setDraftName(name);
            setEditing(true);
          }}
          className="inline-flex h-[27px] items-center gap-1.5 rounded-[6px] px-1.5 text-[14px] font-semibold leading-[1.25] text-[#171717] transition-colors hover:bg-[#F5F5F5]"
          aria-label={`Rename ${name}`}
        >
          <span className="max-w-[200px] truncate">{name}</span>
          <svg viewBox="0 0 14 14" fill="none" className="h-[13px] w-[13px] text-[#737373]" aria-hidden="true">
            <path d="M9 2.5 11.5 5 5 11.5H2.5V9L9 2.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
          </svg>
        </button>
      )}
      <button
        type="button"
        onClick={onDelete}
        className="inline-flex h-[27px] items-center justify-center rounded-[6px] bg-white px-2.5 text-[12px] font-medium leading-none text-[#EF4444] shadow-[0_0.45px_1px_rgba(10,10,10,0.2)] transition-colors hover:bg-[#FEF2F2]"
      >
        Delete direction
      </button>
    </div>
  );
}

function MoodboardGeneratingState({ mode }: { mode: "ai" | "figma" }) {
  const isFigmaImport = mode === "figma";

  return (
    <section className="rounded-[12px] bg-[#F5F5F5] p-1 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
      <div className="rounded-[8px] bg-white px-[44px] py-[44px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
        <div className="flex min-h-[520px] items-center justify-center">
          <div className="flex w-full max-w-[282px] flex-col items-center gap-6">
            <img
              src={isFigmaImport ? "/logos/integrations/figma.svg" : "/logos/dashboard/moodboard.svg"}
              alt=""
              aria-hidden="true"
              className="h-[37px] w-[37px]"
            />

            <div className="flex w-full flex-col items-center gap-2">
              <p className="text-center text-[16px] font-semibold leading-none text-[#171717]">
                {isFigmaImport ? "Importing from Figma" : "Generating Moodboard"}
              </p>
              <p className="text-center text-[13px] font-medium leading-[1.5] text-[#525252]">
                {isFigmaImport
                  ? "Collecting images from your Figma file and preparing them for review."
                  : "Finding visual references that match your search and preparing them for review."}
              </p>
            </div>

            <div className="flex w-full flex-col items-center gap-2">
              <MoodboardLoadingStep
                icon="/logos/check.svg"
                label={isFigmaImport ? "Figma link validated" : "Search query prepared"}
              />
              <MoodboardLoadingStep
                icon="/logos/check.svg"
                label={isFigmaImport ? "Figma import started" : "Refero search started"}
              />
              <MoodboardLoadingStep
                icon="/logos/loader.svg"
                label={isFigmaImport ? "Collecting Figma images" : "Collecting visual references"}
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
