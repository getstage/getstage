import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "convex/react";
import { UpstreamStaleBanner } from "@/components/project/UpstreamStaleBanner";
import {
  createSeedConfigureScreens,
  MOCK_WIREFRAMES_GENERATED_AT_LABEL,
  WIREFRAMES_RESULTS_PREVIEW_LIMIT,
} from "@/data/fixtures/project/wireframesTabFixtures";
import { useAssetsTab, useMoodboardArtifact, useWireframesTab } from "@/hooks/project";
import { useFigmaWireframeExport } from "@/hooks/project/assets/useFigmaWireframeExport";
import { useWireframeDeliveryExport } from "@/hooks/project/assets/useWireframeDeliveryExport";
import { useWireframeBrandKit } from "@/hooks/project/wireframes";
import { api } from "@/lib/convexApi";
import { buildResultCards } from "@/lib/project/mapWireframesArtifactToTabData";
import type { Project } from "@/models/project/project";
import type { WireframeAssetCard } from "@/types/project/assetsTab";
import type { WireframeKindChoice, WireframeStep, WireframesTabData } from "@/types/project/wireframesTab";
import { ExportOptionsDialog } from "../assets/ExportOptionsDialog";
import { BrandKitStep } from "./BrandKitStep";
import { CanvasShell } from "./CanvasShell";
import { ConfigureStep } from "./ConfigureStep";
import { GeneratingStep } from "./GeneratingStep";
import { ResultsGrid } from "./ResultsGrid";
import { StyleGuideStep } from "./StyleGuideStep";
import { TabLoadingState } from "../TabLoadingState";
import type { BrandSource, BrandSourceChoice } from "./TypeChooser";
import { TypeChooser } from "./TypeChooser";
import { WireframeKindChooser } from "./WireframeKindChooser";

type WireframesTabProps = {
  project: Project;
  onGoToResearch?: () => void;
  onGoToStrategy?: () => void;
  onGoToFlows?: () => void;
  onGoToMoodboard: () => void;
};

function getRestoredWireframeUiState(
  tabData: WireframesTabData | undefined,
  isGenerating: boolean,
  seedScreens: ReturnType<typeof createSeedConfigureScreens>,
) {
  if (!tabData) {
    return {
      step: "choose-kind" as WireframeStep,
      wireframeKind: null as WireframeKindChoice,
      brandSource: null as BrandSourceChoice,
      styleDirectionId: null as string | null,
      screens: seedScreens,
    };
  }

  return {
    step: (tabData.generatedScreens.length > 0
      ? isGenerating
        ? "generating"
        : "results"
      : "choose-kind") as WireframeStep,
    wireframeKind: tabData.wireframeKind as WireframeKindChoice,
    brandSource: tabData.brandSource as BrandSourceChoice,
    styleDirectionId: tabData.styleDirectionId,
    screens: tabData.configureScreens,
  };
}

export function WireframesTab({
  project,
  onGoToResearch,
  onGoToStrategy,
  onGoToFlows,
  onGoToMoodboard,
}: WireframesTabProps) {
  const wireframesTab = useWireframesTab({ id: project.id, name: project.name });
  const brandKit = useWireframeBrandKit(project.id);
  const moodboard = useMoodboardArtifact(project.id);
  // Reuse the Assets export pipeline so the same Export dialog drives both tabs.
  const assetsTab = useAssetsTab({ id: project.id, name: project.name });
  const wireframeAssets = assetsTab.tabData.wireframeAssets;
  const figmaExport = useFigmaWireframeExport(project.id);
  const deliveryExport = useWireframeDeliveryExport(project.id);
  const nativeConnections = useQuery(api.integrations.contentPlatforms.getNativeConnectionStatus, {});
  const [exportAsset, setExportAsset] = useState<WireframeAssetCard | null>(null);
  const [regenerateMode, setRegenerateMode] = useState(false);
  const [selectedRegenerateIds, setSelectedRegenerateIds] = useState<Set<string>>(() => new Set());
  // The regenerate flow re-uses the artifact's brand source by default, but the
  // user may want to switch (e.g. from a brand-kit result they don't like back
  // to a moodboard style guide). These mirror the live selection the picker
  // below the results grid owns while in regenerate mode.
  const [regenerateBrandSource, setRegenerateBrandSource] = useState<BrandSourceChoice>(null);
  const [regenerateStyleDirectionId, setRegenerateStyleDirectionId] = useState<string | null>(
    null,
  );
  const seedScreens = useMemo(() => createSeedConfigureScreens(), []);
  const hydratedProjectRef = useRef<string | null>(null);
  const tabData = wireframesTab.data?.tabData;
  const isGenerating = wireframesTab.isGenerating;
  const [step, setStep] = useState<WireframeStep>(() =>
    getRestoredWireframeUiState(tabData, isGenerating, seedScreens).step,
  );
  const [wireframeKind, setWireframeKind] = useState<WireframeKindChoice>(() =>
    getRestoredWireframeUiState(tabData, isGenerating, seedScreens).wireframeKind,
  );
  const [brandSource, setBrandSource] = useState<BrandSourceChoice>(() =>
    getRestoredWireframeUiState(tabData, isGenerating, seedScreens).brandSource,
  );
  const [styleDirectionId, setStyleDirectionId] = useState<string | null>(() =>
    getRestoredWireframeUiState(tabData, isGenerating, seedScreens).styleDirectionId,
  );
  const [screens, setScreens] = useState(() =>
    getRestoredWireframeUiState(tabData, isGenerating, seedScreens).screens,
  );
  if (tabData && !wireframesTab.isRunsLoading) {
    hydratedProjectRef.current = project.id;
  }
  // Results metadata is read live from the artifact so a fresh run (e.g. a Hi-Fi conversion)
  // always reflects the latest generation instead of stale mirrored state.
  const generatedScreens = wireframesTab.data?.tabData.generatedScreens ?? [];
  const generatedAt = wireframesTab.data?.tabData.generatedAt;
  const generatedAtLabel =
    wireframesTab.data?.tabData.generatedAtLabel ?? MOCK_WIREFRAMES_GENERATED_AT_LABEL;
  const selectedCount = screens.filter((screen) => screen.selected).length;

  // Moodboard style directions that have a style guide attached.
  const styleDirections = useMemo(
    () =>
      (moodboard.data?.artifact.directions ?? [])
        .filter((direction) => direction.hasStyleGuide)
        .map((direction) => ({
          id: direction.id,
          title: direction.name,
          count: direction.referenceCount ?? 0,
          images:
            moodboard.data?.artifact.references
              .filter((reference) => reference.directionId === direction.id)
              .map((reference) => reference.thumbnailUrl ?? reference.imageUrl)
              .slice(0, 6) ?? [],
        })),
    [moodboard.data],
  );

  const isConvertingFromLofiRef = useRef(false);
  // "Change source" in the regenerate picker borrows the same choose-type /
  // style-guide / brand-kit steps Convert-to-Hi-Fi uses (real card picker,
  // real upload UI) instead of a separate inline widget. This flag routes
  // their onContinue back to the regenerate picker instead of starting a run.
  const isChangingRegenerateSourceRef = useRef(false);
  useEffect(() => {
    if (hydratedProjectRef.current === project.id) {
      return;
    }
    if (!wireframesTab.data?.tabData || wireframesTab.isRunsLoading) {
      return;
    }

    const { tabData } = wireframesTab.data;
    hydratedProjectRef.current = project.id;
    setWireframeKind(tabData.wireframeKind);
    setBrandSource(tabData.brandSource);
    setStyleDirectionId(tabData.styleDirectionId);
    setScreens(tabData.configureScreens);
    if (tabData.generatedScreens.length > 0) {
      setStep(wireframesTab.isGenerating ? "generating" : "results");
    }
  }, [project.id, wireframesTab.data, wireframesTab.isGenerating, wireframesTab.isRunsLoading]);

  function continueFromSource(source: BrandSource) {
    setBrandSource(source);
    if (source === "brand-kit") {
      setStyleDirectionId(null);
      setStep("brand-kit");
      return;
    }
    setStep("style-guide");
  }

  function consumeConversionFlag() {
    if (!isConvertingFromLofiRef.current) {
      return false;
    }
    isConvertingFromLofiRef.current = false;
    return true;
  }

  function applyRegenerateSourceChange(nextBrandSource: BrandSource) {
    setRegenerateBrandSource(nextBrandSource);
    setRegenerateStyleDirectionId(nextBrandSource === "style-guide" ? styleDirectionId : null);
    setStep("results");
  }

  async function generateWireframes(overrides?: {
    wireframeKind?: "lofi" | "hifi";
    brandSource?: BrandSourceChoice;
    styleDirectionId?: string | null;
    brandKitKeys?: string[];
    brandKitLoading?: boolean;
    screens?: typeof screens;
    source?: string;
    prompt?: string;
  }) {
    setRegenerateMode(false);
    setSelectedRegenerateIds(new Set());

    const converting = consumeConversionFlag();
    const resolvedKind = overrides?.wireframeKind ?? wireframeKind ?? "lofi";
    const resolvedBrandSource = overrides?.brandSource ?? brandSource;
    const resolvedStyleDirectionId =
      overrides?.styleDirectionId ??
      (resolvedBrandSource === "style-guide" ? styleDirectionId : null);
    const resolvedBrandKitKeys =
      overrides?.brandKitKeys ??
      (resolvedBrandSource === "brand-kit" ? brandKit.uploadedKeys : []);
    const resolvedScreens =
      overrides?.screens ??
      (converting
        ? (wireframesTab.data?.tabData.configureScreens ?? screens)
        : screens);
    const fallbackStep = converting ? "results" : "configure";

    try {
      await wireframesTab.generateWireframes({
        wireframeKind: resolvedKind,
        brandSource: resolvedBrandSource,
        styleDirectionId: resolvedStyleDirectionId,
        brandKitKeys: resolvedBrandKitKeys,
        brandKitLoading: overrides?.brandKitLoading ?? brandKit.isLoading,
        screens: resolvedScreens,
        source: overrides?.source,
        prompt: overrides?.prompt,
      });
      setStep("generating");
    } catch {
      setStep(fallbackStep);
    }
  }

  function finishConversionIfNeeded(nextBrandSource: BrandSource) {
    if (!isConvertingFromLofiRef.current) {
      return false;
    }
    void generateWireframes({
      wireframeKind: "hifi",
      brandSource: nextBrandSource,
      styleDirectionId: nextBrandSource === "style-guide" ? styleDirectionId : null,
      brandKitKeys: nextBrandSource === "brand-kit" ? brandKit.uploadedKeys : [],
      brandKitLoading: brandKit.isLoading,
    });
    return true;
  }

  useEffect(() => {
    if (step !== "generating") {
      return;
    }
    if (!wireframesTab.isGenerating && wireframesTab.data) {
      setStep("results");
      return;
    }
    if (!wireframesTab.isGenerating && wireframesTab.error) {
      setStep(wireframeKind === "hifi" && generatedScreens.length > 0 ? "results" : "configure");
    }
  }, [
    generatedScreens.length,
    step,
    wireframeKind,
    wireframesTab.data,
    wireframesTab.error,
    wireframesTab.isGenerating,
  ]);

  const generatedCards = useMemo(
    () =>
      buildResultCards(
        screens,
        generatedAtLabel,
        WIREFRAMES_RESULTS_PREVIEW_LIMIT,
        generatedScreens,
        generatedAt,
      ),
    [generatedAt, generatedAtLabel, generatedScreens, screens],
  );

  const regenerateDirectionTitle =
    regenerateBrandSource === "style-guide"
      ? styleDirections.find((direction) => direction.id === regenerateStyleDirectionId)?.title
      : null;

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
      {step === "choose-type" ? (
        <CanvasShell centered>
          <TypeChooser
            selectedSource={brandSource}
            onSelect={setBrandSource}
            onContinue={continueFromSource}
          />
        </CanvasShell>
      ) : null}

      {step === "choose-kind" ? (
        <CanvasShell centered>
          <WireframeKindChooser
            selectedKind={wireframeKind}
            onSelect={setWireframeKind}
            onBack={onGoToFlows}
            onContinue={() => {
              if (!wireframeKind) {
                return;
              }
              setBrandSource(null);
              setStyleDirectionId(null);
              if (wireframeKind === "lofi") {
                setStep("configure");
                return;
              }
              setStep("choose-type");
            }}
          />
        </CanvasShell>
      ) : null}

      {step === "style-guide" ? (
        <StyleGuideStep
          directions={styleDirections}
          selectedDirectionId={styleDirectionId}
          onSelectDirection={setStyleDirectionId}
          onGenerateStyleGuide={onGoToMoodboard}
          onContinue={() => {
            if (!styleDirectionId) {
              return;
            }
            if (isChangingRegenerateSourceRef.current) {
              isChangingRegenerateSourceRef.current = false;
              applyRegenerateSourceChange("style-guide");
              return;
            }
            if (finishConversionIfNeeded("style-guide")) {
              return;
            }
            setStep("configure");
          }}
        />
      ) : null}

      {step === "brand-kit" ? (
        <CanvasShell centered>
          <BrandKitStep
            files={brandKit.files}
            accept={brandKit.accept}
            isUploading={brandKit.isUploading}
            error={brandKit.error}
            onUploadFiles={brandKit.uploadFiles}
            onRemove={brandKit.removeFile}
            onContinue={() => {
              setBrandSource("brand-kit");
              if (isChangingRegenerateSourceRef.current) {
                isChangingRegenerateSourceRef.current = false;
                applyRegenerateSourceChange("brand-kit");
                return;
              }
              if (finishConversionIfNeeded("brand-kit")) {
                return;
              }
              setStep("configure");
            }}
          />
        </CanvasShell>
      ) : null}

      {step === "configure" ? (
        <ConfigureStep
          wireframeKind={wireframeKind ?? "lofi"}
          screens={screens}
          selectedCount={selectedCount}
          onChangeType={() => setStep("choose-kind")}
          onAddBrandKit={() => {
            setWireframeKind("hifi");
            setBrandSource("brand-kit");
            setStep("brand-kit");
          }}
          onToggle={(id) =>
            setScreens((current) =>
              current.map((screen) =>
                screen.id === id && !screen.required ? { ...screen, selected: !screen.selected } : screen,
              ),
            )
          }
          onGenerate={() => {
            void generateWireframes();
          }}
        />
      ) : null}

      {step === "generating" ? (
        <CanvasShell centered>
          <GeneratingStep mode={wireframesTab.isRegenerateRun ? "regenerate" : "generate"} />
        </CanvasShell>
      ) : null}

      {step === "results" ? (
        <ResultsGrid
          wireframeKind={wireframeKind ?? "lofi"}
          cards={generatedCards}
          onExport={(cardId) =>
            setExportAsset(wireframeAssets.find((asset) => asset.id === cardId) ?? null)
          }
          onConvert={() => {
            if (wireframesTab.isGenerating) {
              return;
            }
            isConvertingFromLofiRef.current = true;
            setWireframeKind("hifi");
            setBrandSource(null);
            setStyleDirectionId(null);
            setStep("choose-type");
          }}
          isGenerating={wireframesTab.isGenerating}
          regenerateMode={regenerateMode}
          selectedRegenerateIds={selectedRegenerateIds}
          regeneratingScreenIds={wireframesTab.regeneratingScreenIds}
          onStartRegenerate={() => {
            setRegenerateMode(true);
            setSelectedRegenerateIds(new Set());
            // Seed the picker with the values that produced the current results
            // so the user starts from a known state rather than a blank choice.
            setRegenerateBrandSource(
              brandSource ?? wireframesTab.data?.tabData.brandSource ?? null,
            );
            setRegenerateStyleDirectionId(
              brandSource === "style-guide"
                ? (styleDirectionId ?? wireframesTab.data?.tabData.styleDirectionId ?? null)
                : null,
            );
          }}
          onCancelRegenerate={() => {
            setRegenerateMode(false);
            setSelectedRegenerateIds(new Set());
            setRegenerateBrandSource(null);
            setRegenerateStyleDirectionId(null);
          }}
          onToggleRegenerateSelection={(cardId) => {
            setSelectedRegenerateIds((current) => {
              const next = new Set(current);
              if (next.has(cardId)) {
                next.delete(cardId);
              } else {
                next.add(cardId);
              }
              return next;
            });
          }}
          onConfirmRegenerate={() => {
            const screenIds = Array.from(selectedRegenerateIds);
            if (screenIds.length === 0 || wireframesTab.isGenerating) {
              return;
            }

            const resolvedBrandSource = regenerateBrandSource;
            const resolvedStyleDirectionId =
              resolvedBrandSource === "style-guide" ? regenerateStyleDirectionId : null;

            void wireframesTab
              .regenerateScreens({
                screenIds,
                wireframeKind: wireframeKind ?? "hifi",
                brandSource: resolvedBrandSource,
                styleDirectionId: resolvedStyleDirectionId,
                brandKitKeys:
                  resolvedBrandSource === "brand-kit" ? brandKit.uploadedKeys : [],
                brandKitLoading: brandKit.isLoading,
              })
              .then(() => {
                setRegenerateMode(false);
                setSelectedRegenerateIds(new Set());
                setRegenerateBrandSource(null);
                setRegenerateStyleDirectionId(null);
                // Mirror the picked values into the tab so the next "Convert"
                // / "Regenerate" defaults to them, matching the artifact that
                // is about to be written.
                setBrandSource(resolvedBrandSource);
                setStyleDirectionId(resolvedStyleDirectionId);
                setStep("generating");
              })
              .catch(() => undefined);
          }}
          regeneratePicker={
            regenerateMode ? (
              <div className="flex flex-wrap items-center gap-3 rounded-[8px] bg-white p-3 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
                <span className="text-[12px] font-medium text-[#525252]">
                  {regenerateBrandSource === "brand-kit"
                    ? `Brand Kit${brandKit.files.length > 0 ? ` · ${brandKit.files.length} file${brandKit.files.length === 1 ? "" : "s"}` : ""}`
                    : regenerateBrandSource === "style-guide"
                      ? `Style Guide${regenerateDirectionTitle ? ` · ${regenerateDirectionTitle}` : ""}`
                      : "No brand source selected"}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    isChangingRegenerateSourceRef.current = true;
                    setBrandSource(regenerateBrandSource);
                    setStyleDirectionId(regenerateStyleDirectionId);
                    setStep("choose-type");
                  }}
                  className="inline-flex h-9 items-center gap-2 rounded-[6px] border border-[#D4D4D4] bg-white px-3 text-[12px] font-medium text-[#171717] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] hover:bg-[#FAFAFA]"
                >
                  Change source
                </button>
              </div>
            ) : null
          }
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
