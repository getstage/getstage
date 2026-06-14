import { useEffect, useMemo, useState } from "react";
import { UpstreamStaleBanner } from "@/components/project/UpstreamStaleBanner";
import {
  createSeedConfigureScreens,
  MOCK_WIREFRAMES_GENERATED_AT_LABEL,
  WIREFRAMES_RESULTS_PREVIEW_LIMIT,
} from "@/data/fixtures/project/wireframesTabFixtures";
import { useMoodboardArtifact, useWireframesTab } from "@/hooks/project";
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
  onGoToAssets: () => void;
};

export function WireframesTab({
  project,
  onGoToResearch,
  onGoToStrategy,
  onGoToAssets,
}: WireframesTabProps) {
  const wireframesTab = useWireframesTab({ id: project.id, name: project.name });
  const moodboard = useMoodboardArtifact(project.id);
  const seedScreens = useMemo(() => createSeedConfigureScreens(), []);
  const [step, setStep] = useState<WireframeStep>("choose-kind");
  const [wireframeKind, setWireframeKind] = useState<WireframeKindChoice>(null);
  const [brandSource, setBrandSource] = useState<BrandSourceChoice>(null);
  const [styleDirectionId, setStyleDirectionId] = useState<string | null>(null);
  const [hasBrandKit, setHasBrandKit] = useState(false);
  const [screens, setScreens] = useState(seedScreens);
  const [generatedAtLabel, setGeneratedAtLabel] = useState(MOCK_WIREFRAMES_GENERATED_AT_LABEL);
  const generatedScreens = wireframesTab.data?.tabData.generatedScreens ?? [];
  const selectedCount = screens.filter((screen) => screen.selected).length;

  useEffect(() => {
    if (!wireframesTab.data?.tabData) {
      return;
    }

    const { tabData } = wireframesTab.data;
    setWireframeKind(tabData.wireframeKind);
    setBrandSource(tabData.brandSource);
    setStyleDirectionId(tabData.styleDirectionId);
    setScreens(tabData.configureScreens);
    setGeneratedAtLabel(tabData.generatedAtLabel);
    if (tabData.generatedScreens.length > 0) {
      setStep("results");
    }
  }, [wireframesTab.data]);

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
      ),
    [generatedAtLabel, generatedScreens, screens],
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
          onBack={() => {
            setBrandSource(null);
            setStep("choose-type");
          }}
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
            hasBrandKit={hasBrandKit}
            onUpload={() => setHasBrandKit(true)}
            onRemove={() => setHasBrandKit(false)}
            onBack={() => {
              setBrandSource(null);
              setStep("choose-type");
            }}
            onContinue={() => setStep("configure")}
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
          <GeneratingStep />
        </CanvasShell>
      ) : null}

      {step === "results" ? (
        <ResultsGrid
          wireframeKind={wireframeKind ?? "lofi"}
          cards={generatedCards}
          onExportToFigma={onGoToAssets}
          onConvert={() => {
            setWireframeKind("hifi");
            setStep("brand-kit");
          }}
        />
      ) : null}
    </section>
  );
}
