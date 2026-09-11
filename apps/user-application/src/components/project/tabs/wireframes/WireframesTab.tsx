import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import type { Id } from "@stage/data-ops/convex/data-model";
import { UpstreamStaleBanner } from "@/components/project/UpstreamStaleBanner";
import {
  createSeedConfigureScreens,
  MOCK_WIREFRAMES_GENERATED_AT_LABEL,
  WIREFRAMES_RESULTS_PREVIEW_LIMIT,
} from "@/data/fixtures/project/wireframesTabFixtures";
import { useAssetsTab, useWireframesTab } from "@/hooks/project";
import { useFigmaWireframeExport } from "@/hooks/project/assets/useFigmaWireframeExport";
import { useWireframeDeliveryExport } from "@/hooks/project/assets/useWireframeDeliveryExport";
import { api } from "@/lib/convexApi";
import {
  buildResultCards,
  hasDisplayableWireframeResults,
} from "@/lib/project/mapWireframesArtifactToTabData";
import type { Project } from "@/models/project/project";
import type { WireframeAssetCard } from "@/types/project/assetsTab";
import type { WireframesTabData } from "@/types/project/wireframesTab";
import { ExportOptionsDialog } from "../assets/ExportOptionsDialog";
import { TabLoadingState } from "../TabLoadingState";
import { CanvasShell } from "./CanvasShell";
import { ConfigureStep } from "./ConfigureStep";
import { GeneratingStep } from "./GeneratingStep";
import { ResultsGrid } from "./ResultsGrid";

type WireframesTabProps = {
  project: Project;
  onGoToResearch?: () => void;
  onGoToStrategy?: () => void;
};

function createScreenId(title: string, existingIds: Iterable<string>) {
  const base =
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "screen";
  const taken = new Set(existingIds);
  if (!taken.has(base)) return base;

  let suffix = 2;
  while (taken.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

function restoredState(
  tabData: WireframesTabData | undefined,
  seedScreens: ReturnType<typeof createSeedConfigureScreens>,
) {
  return {
    showConfigure: !hasDisplayableWireframeResults(tabData),
    screens: tabData?.configureScreens ?? seedScreens,
  };
}

export function WireframesTab({
  project,
  onGoToResearch,
  onGoToStrategy,
}: WireframesTabProps) {
  const wireframesTab = useWireframesTab({ id: project.id, name: project.name });
  const wireframeAssets = useAssetsTab({
    id: project.id,
    name: project.name,
  }).tabData.wireframeAssets;
  const figmaExport = useFigmaWireframeExport(project.id);
  const deliveryExport = useWireframeDeliveryExport(project.id);
  const nativeConnections = useQuery(api.integrations.contentPlatforms.getNativeConnectionStatus, {});
  const clearWireframeScreens = useMutation(api.projectAi.clearWireframeScreens);
  const seedScreens = useMemo(() => createSeedConfigureScreens(), []);
  const tabData = wireframesTab.data?.tabData;
  const hydratedProjectRef = useRef<string | null>(null);
  const initialState = restoredState(tabData, seedScreens);
  const [showConfigure, setShowConfigure] = useState(initialState.showConfigure);
  const [screens, setScreens] = useState(initialState.screens);
  const [exportAsset, setExportAsset] = useState<WireframeAssetCard | null>(null);
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedDeleteIds, setSelectedDeleteIds] = useState<Set<string>>(() => new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const hasResults = hasDisplayableWireframeResults(tabData);
  const selectedCount = screens.filter((screen) => screen.selected).length;
  const wasGeneratingRef = useRef(false);

  useEffect(() => {
    if (
      hydratedProjectRef.current === project.id ||
      wireframesTab.isLoading ||
      wireframesTab.isRunsLoading
    ) {
      return;
    }
    const restored = restoredState(tabData, seedScreens);
    hydratedProjectRef.current = project.id;
    setScreens(restored.screens);
    setShowConfigure(restored.showConfigure);
  }, [
    project.id,
    seedScreens,
    tabData,
    wireframesTab.isLoading,
    wireframesTab.isRunsLoading,
  ]);

  useEffect(() => {
    if (wireframesTab.isGenerating) {
      wasGeneratingRef.current = true;
      return;
    }
    if (!wasGeneratingRef.current) {
      return;
    }
    if (wireframesTab.error) {
      wasGeneratingRef.current = false;
      setShowConfigure(true);
      return;
    }
    if (hasResults) {
      wasGeneratingRef.current = false;
      setShowConfigure(false);
    }
  }, [hasResults, wireframesTab.error, wireframesTab.isGenerating]);

  const generatedCards = useMemo(
    () =>
      buildResultCards(
        screens,
        tabData?.generatedAtLabel ?? MOCK_WIREFRAMES_GENERATED_AT_LABEL,
        WIREFRAMES_RESULTS_PREVIEW_LIMIT,
        tabData?.generatedScreens,
        tabData?.generatedAt,
      ),
    [screens, tabData],
  );

  async function generateWireframes() {
    try {
      await wireframesTab.generateWireframes({ screens });
    } catch {
      setShowConfigure(true);
    }
  }

  if (wireframesTab.isLoading || wireframesTab.isRunsLoading) {
    return <TabLoadingState label="Loading wireframes…" />;
  }

  return (
    <section className="w-full">
      <UpstreamStaleBanner
        projectId={project.id}
        onGoToResearch={onGoToResearch}
        onGoToStrategy={onGoToStrategy}
      />
      {wireframesTab.error && !wireframesTab.isGenerating ? (
        <p className="mb-4 whitespace-pre-wrap text-[13px] font-medium leading-[1.5] text-[#DC2626]">
          {wireframesTab.error}
        </p>
      ) : null}

      {!wireframesTab.isGenerating && (showConfigure || !hasResults) ? (
        <ConfigureStep
          screens={screens}
          selectedCount={selectedCount}
          providerOptions={wireframesTab.providerOptions}
          selectedProviderId={wireframesTab.selectedProviderId}
          onSelectProvider={wireframesTab.selectProvider}
          onBackToResults={hasResults ? () => setShowConfigure(false) : undefined}
          onToggle={(id) =>
            setScreens((current) =>
              current.map((screen) =>
                screen.id === id ? { ...screen, selected: !screen.selected } : screen,
              ),
            )
          }
          onAddScreen={(draft) =>
            setScreens((current) => [
              ...current,
              {
                id: createScreenId(draft.title, current.map((screen) => screen.id)),
                ...draft,
                priority: "P2",
                required: false,
                selected: true,
              },
            ])
          }
          onEditScreen={(id, draft) =>
            setScreens((current) =>
              current.map((screen) => (screen.id === id ? { ...screen, ...draft } : screen)),
            )
          }
          onDeleteScreen={(id) =>
            setScreens((current) => current.filter((screen) => screen.id !== id))
          }
          onGenerate={() => void generateWireframes()}
        />
      ) : null}

      {wireframesTab.isGenerating ? (
        <CanvasShell centered>
          <GeneratingStep
            onCancel={() => {
              void wireframesTab.cancelWireframes().then(() => {
                setShowConfigure(!hasResults);
              });
            }}
          />
        </CanvasShell>
      ) : null}

      {!wireframesTab.isGenerating && !showConfigure && hasResults ? (
        <ResultsGrid
          cards={generatedCards}
          onExport={(cardId) =>
            setExportAsset(wireframeAssets.find((asset) => asset.id === cardId) ?? null)
          }
          onManageScreens={() => {
            setDeleteMode(false);
            setSelectedDeleteIds(new Set());
            setShowConfigure(true);
          }}
          deleteMode={deleteMode}
          selectedDeleteIds={selectedDeleteIds}
          onStartDelete={() => {
            setDeleteMode(true);
            setSelectedDeleteIds(new Set());
          }}
          onCancelDelete={() => {
            setDeleteMode(false);
            setSelectedDeleteIds(new Set());
          }}
          onToggleDeleteSelection={(cardId) => {
            setSelectedDeleteIds((current) => {
              const next = new Set(current);
              if (next.has(cardId)) next.delete(cardId);
              else next.add(cardId);
              return next;
            });
          }}
          onConfirmDelete={() => {
            const screenIds = Array.from(selectedDeleteIds);
            if (
              screenIds.length === 0 ||
              isDeleting ||
              !window.confirm(
                `Delete ${screenIds.length} selected wireframe${screenIds.length === 1 ? "" : "s"}?`,
              )
            ) {
              return;
            }
            setIsDeleting(true);
            void clearWireframeScreens({
              projectId: project.id as Id<"projects">,
              screenIds,
            })
              .then(() => {
                setScreens((current) =>
                  current.map((screen) =>
                    screenIds.includes(screen.id) ? { ...screen, selected: false } : screen,
                  ),
                );
                setDeleteMode(false);
                setSelectedDeleteIds(new Set());
                if (screenIds.length === generatedCards.length) setShowConfigure(true);
              })
              .finally(() => setIsDeleting(false));
          }}
          isDeleting={isDeleting}
        />
      ) : null}

      <ExportOptionsDialog
        asset={exportAsset}
        figmaConnected={nativeConnections?.figma?.status === "active"}
        exportRequest={figmaExport.request}
        exportJob={figmaExport.job}
        exportError={figmaExport.error}
        deliveryMessage={deliveryExport.message}
        deliveryError={deliveryExport.error}
        isExporting={figmaExport.isExporting || deliveryExport.isExporting}
        onExportFigma={async (asset) => {
          await figmaExport.startExport(asset);
        }}
        onExportDelivery={deliveryExport.startExport}
        open={exportAsset !== null}
        onOpenChange={(open) => {
          if (!open) {
            setExportAsset(null);
            figmaExport.reset();
            deliveryExport.reset();
          }
        }}
      />
    </section>
  );
}
