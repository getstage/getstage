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
import { AiRunSettings } from "@/components/project/AiRunSettings";
import { api } from "@/lib/convexApi";
import { buildResultCards } from "@/lib/project/mapWireframesArtifactToTabData";
import type { Project } from "@/models/project/project";
import type { WireframeAssetCard } from "@/types/project/assetsTab";
import type { ScreenItem, WireframeKindChoice, WireframeStep } from "@/types/project/wireframesTab";
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
import { WireframeRunSelection } from "./WireframeRunSelection";

type WireframesTabProps = {
  project: Project;
  skillIds: readonly string[];
  componentPackIds: readonly string[];
  onSaveSkills: (input: { skillIds: string[]; componentPackIds: string[] }) => Promise<void>;
  onGoToResearch?: () => void;
  onGoToStrategy?: () => void;
  onGoToFlows?: () => void;
  onGoToMoodboard: () => void;
};

/**
 * Steps the user drives by hand. "generating" and "results" are deliberately absent:
 * both are facts about the server, so they are derived per render instead of mirrored
 * into state that can go stale while the tab is unmounted.
 */
type SetupStep = Exclude<WireframeStep, "generating" | "results">;

export function WireframesTab({
  project,
  skillIds,
  componentPackIds,
  onSaveSkills,
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
  const [regenerateSelectionBusy, setRegenerateSelectionBusy] = useState(false);
  const seedScreens = useMemo(() => createSeedConfigureScreens(), []);
  const tabData = wireframesTab.data?.tabData;
  const isGenerating = wireframesTab.isGenerating;
  // `null` means "show whatever the server says". Only an explicit user step overrides
  // that, so leaving the tab mid-run and coming back cannot strand the UI on the wizard.
  const [setupStep, setSetupStep] = useState<SetupStep | null>(null);
  const [wireframeKind, setWireframeKind] = useState<WireframeKindChoice>(null);
  const [brandSource, setBrandSource] = useState<BrandSourceChoice>(null);
  const [styleDirectionId, setStyleDirectionId] = useState<string | null>(null);
  // Local edits win while configuring; otherwise the saved screen set, then the seed.
  const [localScreens, setLocalScreens] = useState<ScreenItem[] | null>(null);
  const screens = localScreens ?? tabData?.configureScreens ?? seedScreens;
  const hydratedProjectRef = useRef<string | null>(null);
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
  // Restore the choices that produced the current artifact so Convert and Regenerate
  // start from the real brand context rather than a blank one. Runs once per project;
  // the wizard states are derived, so nothing else needs rehydrating.
  useEffect(() => {
    if (hydratedProjectRef.current === project.id) {
      return;
    }
    if (!tabData || wireframesTab.isRunsLoading) {
      return;
    }

    hydratedProjectRef.current = project.id;
    setWireframeKind(tabData.wireframeKind);
    setBrandSource(tabData.brandSource);
    setStyleDirectionId(tabData.styleDirectionId);
  }, [project.id, tabData, wireframesTab.isRunsLoading]);

  function continueFromSource(source: BrandSource) {
    setBrandSource(source);
    if (source === "brand-kit") {
      setStyleDirectionId(null);
      setSetupStep("brand-kit");
      return;
    }
    setSetupStep("style-guide");
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
    setSetupStep(null);
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
    // A failed conversion drops back to the server view, which still holds the Lo-Fi
    // results the user converted from. A failed first run drops back to configure.
    const fallbackStep: SetupStep | null = converting ? null : "configure";

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
      // Hand control back to the server view: the run makes this "generating", and
      // finishing it makes it "results", with no step bookkeeping in between.
      setSetupStep(null);
    } catch {
      setSetupStep(fallbackStep);
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

  // A live run outranks every local step, so returning to the tab mid-run always shows
  // progress. Once it finishes, saved results become the default view. `setupStep` is the
  // only thing that overrides either, and only while the user is actually in the wizard.
  if (isGenerating) {
    return (
      <section className="w-full">
        <CanvasShell centered>
          <GeneratingStep
            mode={wireframesTab.isRegenerateRun ? "regenerate" : "generate"}
            screenCount={wireframesTab.regeneratingScreenIds?.length ?? selectedRegenerateIds.size}
            elapsedSeconds={wireframesTab.elapsedSeconds}
          />
        </CanvasShell>
      </section>
    );
  }

  const view: SetupStep | "results" =
    setupStep ?? (generatedScreens.length > 0 ? "results" : "choose-kind");

  return (
    <section className="w-full">
      <UpstreamStaleBanner
        projectId={project.id}
        onGoToResearch={onGoToResearch}
        onGoToStrategy={onGoToStrategy}
      />
      {wireframesTab.error ? (
        <p className="mb-4 whitespace-pre-wrap text-[13px] font-medium leading-[1.5] text-[#DC2626]">
          {wireframesTab.error}
        </p>
      ) : null}
      {view === "choose-type" ? (
        <CanvasShell centered>
          <TypeChooser
            selectedSource={brandSource}
            onSelect={setBrandSource}
            onContinue={continueFromSource}
          />
        </CanvasShell>
      ) : null}

      {view === "choose-kind" ? (
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
                setSetupStep("configure");
                return;
              }
              setSetupStep("choose-type");
            }}
          />
        </CanvasShell>
      ) : null}

      {view === "style-guide" ? (
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
            setSetupStep("configure");
          }}
        />
      ) : null}

      {view === "brand-kit" ? (
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
              setSetupStep("configure");
            }}
          />
        </CanvasShell>
      ) : null}

      {view === "configure" ? (
        <ConfigureStep
          wireframeKind={wireframeKind ?? "lofi"}
          screens={screens}
          selectedCount={selectedCount}
          skillIds={skillIds}
          componentPackIds={componentPackIds}
          providerOptions={wireframesTab.providerOptions}
          selectedProviderId={wireframesTab.selectedProviderId}
          onSelectProvider={wireframesTab.selectProvider}
          onSaveSkills={onSaveSkills}
          onChangeType={() => setSetupStep("choose-kind")}
          onAddBrandKit={() => {
            setWireframeKind("hifi");
            setBrandSource("brand-kit");
            setSetupStep("brand-kit");
          }}
          onToggle={(id) =>
            setLocalScreens(
              screens.map((screen) =>
                // STA-11: required = default-selected, not locked. Users must be able to untick.
                screen.id === id ? { ...screen, selected: !screen.selected } : screen,
              ),
            )
          }
          onGenerate={() => {
            void generateWireframes();
          }}
        />
      ) : null}

      {view === "results" ? (
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
            setSetupStep("choose-type");
          }}
          isGenerating={wireframesTab.isGenerating}
          regenerateMode={regenerateMode}
          selectedRegenerateIds={selectedRegenerateIds}
          regeneratingScreenIds={wireframesTab.regeneratingScreenIds}
          onStartRegenerate={() => {
            setRegenerateMode(true);
            setSelectedRegenerateIds(new Set());
            setRegenerateSelectionBusy(false);
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
            setRegenerateSelectionBusy(false);
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
            if (
              screenIds.length === 0 ||
              wireframesTab.isGenerating ||
              regenerateSelectionBusy ||
              wireframesTab.selectedProviderId === null
            ) {
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
                setRegenerateSelectionBusy(false);
                // Mirror the picked values into the tab so the next "Convert"
                // / "Regenerate" defaults to them, matching the artifact that
                // is about to be written.
                setBrandSource(resolvedBrandSource);
                setStyleDirectionId(resolvedStyleDirectionId);
                setSetupStep(null);
              })
              .catch(() => undefined);
          }}
          regenerateConfirmBlocked={
            regenerateSelectionBusy || wireframesTab.selectedProviderId === null
          }
          regeneratePicker={
            regenerateMode ? (
              <div className="flex flex-col gap-1">
                <WireframeRunSelection
                  skillIds={skillIds}
                  componentPackIds={componentPackIds}
                  onSave={onSaveSkills}
                  onEditStateChange={setRegenerateSelectionBusy}
                />
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-[8px] bg-white p-4 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
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
                      setSetupStep("choose-type");
                    }}
                    className="inline-flex h-9 items-center gap-2 rounded-[6px] border border-[#D4D4D4] bg-white px-3 text-[12px] font-medium text-[#171717] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] hover:bg-[#FAFAFA]"
                  >
                    Change source
                  </button>
                </div>
                <div className="rounded-[8px] bg-white p-4 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
                  <AiRunSettings
                    providerOptions={wireframesTab.providerOptions}
                    selectedProviderId={wireframesTab.selectedProviderId}
                    onSelectProvider={wireframesTab.selectProvider}
                  />
                </div>
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
