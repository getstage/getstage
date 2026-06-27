import { useEffect, useMemo, useRef, useState } from "react";
import { UpstreamStaleBanner } from "@/components/project/UpstreamStaleBanner";
import {
  createSeedConfigureScreens,
  MOCK_WIREFRAMES_GENERATED_AT_LABEL,
  WIREFRAMES_RESULTS_PREVIEW_LIMIT,
} from "@/data/fixtures/project/wireframesTabFixtures";
import { useMoodboardArtifact, useWireframesTab } from "@/hooks/project";
import { useWireframeBrandKit } from "@/hooks/project/wireframes";
import { buildResultCards } from "@/lib/project/mapWireframesArtifactToTabData";
import type { Project } from "@/models/project/project";
import type { WireframeKindChoice, WireframeStep } from "@/types/project/wireframesTab";
import { BrandKitStep } from "./BrandKitStep";
import { CanvasShell } from "./CanvasShell";
import { ConfigureStep } from "./ConfigureStep";
import { GeneratingStep } from "./GeneratingStep";
import { ResultsGrid } from "./ResultsGrid";
import { StyleGuideStep } from "./StyleGuideStep";
import type { BrandSource, BrandSourceChoice } from "./TypeChooser";
import { TypeChooser } from "./TypeChooser";
import { WireframeKindChooser } from "./WireframeKindChooser";

type WireframesTabProps = {
  project: Project;
  onGoToResearch?: () => void;
  onGoToStrategy?: () => void;
  onGoToFlows?: () => void;
  onGoToMoodboard: () => void;
  onGoToAssets: () => void;
};

export function WireframesTab({
  project,
  onGoToResearch,
  onGoToStrategy,
  onGoToFlows,
  onGoToMoodboard,
  onGoToAssets,
}: WireframesTabProps) {
  const wireframesTab = useWireframesTab({ id: project.id, name: project.name });
  const brandKit = useWireframeBrandKit(project.id);
  const moodboard = useMoodboardArtifact(project.id);
  const seedScreens = useMemo(() => createSeedConfigureScreens(), []);
  const [step, setStep] = useState<WireframeStep>("choose-kind");
  const [wireframeKind, setWireframeKind] = useState<WireframeKindChoice>(null);
  const [brandSource, setBrandSource] = useState<BrandSourceChoice>(null);
  const [styleDirectionId, setStyleDirectionId] = useState<string | null>(null);
  const [screens, setScreens] = useState(seedScreens);
  // Results metadata is read live from the artifact so a fresh run (e.g. a Hi-Fi conversion)
  // always reflects the latest generation instead of stale mirrored state.
  const generatedScreens = wireframesTab.data?.tabData.generatedScreens ?? [];
  const generatedAt = wireframesTab.data?.tabData.generatedAt;
  const generatedAtLabel =
    wireframesTab.data?.tabData.generatedAtLabel ?? MOCK_WIREFRAMES_GENERATED_AT_LABEL;
  const selectedCount = screens.filter((screen) => screen.selected).length;

  // Restore state from the saved artifact ONCE per project (on first load / tab return).
  // After that the user owns the step + chosen kind — re-running on every reactive data
  // tick would bounce a Lo-Fi→Hi-Fi conversion straight back to the Lo-Fi results.
  const hydratedProjectRef = useRef<string | null>(null);
  useEffect(() => {
    if (hydratedProjectRef.current === project.id) {
      return;
    }
    if (!wireframesTab.data?.tabData) {
      return;
    }

    const { tabData } = wireframesTab.data;
    hydratedProjectRef.current = project.id;
    setWireframeKind(tabData.wireframeKind);
    setBrandSource(tabData.brandSource);
    setStyleDirectionId(tabData.styleDirectionId);
    setScreens(tabData.configureScreens);
    if (tabData.generatedScreens.length > 0) {
      setStep("results");
    }
  }, [project.id, wireframesTab.data]);

  function continueFromSource(source: BrandSource) {
    setBrandSource(source);
    if (source === "brand-kit") {
      setStyleDirectionId(null);
      setStep("brand-kit");
      return;
    }
    setStep("style-guide");
  }

  async function generateWireframes() {
    setStep("generating");
    try {
      await wireframesTab.generateWireframes({
        wireframeKind: wireframeKind ?? "lofi",
        brandSource,
        styleDirectionId: brandSource === "style-guide" ? styleDirectionId : null,
        brandKitKeys: brandSource === "brand-kit" ? brandKit.uploadedKeys : [],
        screens,
      });
    } catch {
      setStep("configure");
    }
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
      setStep("configure");
    }
  }, [step, wireframesTab.data, wireframesTab.error, wireframesTab.isGenerating]);

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
              if (wireframeKind) {
                setBrandSource(null);
                setStep("choose-type");
              }
            }}
          />
        </CanvasShell>
      ) : null}

      {step === "style-guide" ? (
        <StyleGuideStep
          directions={(moodboard.data?.artifact.directions ?? [])
            .filter((direction) => direction.hasStyleGuide)
            .map((direction) => ({
              id: direction.id,
              title: direction.name,
              count: direction.referenceCount ?? 0,
              images: moodboard.data?.artifact.references
                .filter((reference) => reference.directionId === direction.id)
                .map((reference) => reference.thumbnailUrl ?? reference.imageUrl)
                .slice(0, 6) ?? [],
            }))}
          selectedDirectionId={styleDirectionId}
          onSelectDirection={setStyleDirectionId}
          onGenerateStyleGuide={onGoToMoodboard}
          onContinue={() => {
            if (styleDirectionId) {
              setStep("configure");
            }
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
                screen.id === id ? { ...screen, selected: !screen.selected } : screen,
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
          <GeneratingStep />
        </CanvasShell>
      ) : null}

      {step === "results" ? (
        <ResultsGrid
          wireframeKind={wireframeKind ?? "lofi"}
          cards={generatedCards}
          onExportToFigma={onGoToAssets}
          onConvert={() => {
            // Hi-Fi can be driven by an uploaded brand kit OR an existing style guide,
            // so send the user to the Brand Source chooser instead of forcing brand kit.
            setWireframeKind("hifi");
            setBrandSource(null);
            setStyleDirectionId(null);
            setStep("choose-type");
          }}
        />
      ) : null}
    </section>
  );
}
