import { useEffect, useMemo, useState } from "react";
import {
  createSeedConfigureScreens,
  MOCK_WIREFRAMES_GENERATED_AT_LABEL,
  WIREFRAMES_RESULTS_PREVIEW_LIMIT,
} from "@/data/fixtures/project/wireframesTabFixtures";
import { useWireframesTab } from "@/hooks/project";
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

export function WireframesTab({ project }: { project: Project }) {
  const wireframesTab = useWireframesTab({ id: project.id, name: project.name });
  const seedScreens = useMemo(() => createSeedConfigureScreens(), []);
  const [step, setStep] = useState<WireframeStep>("choose-kind");
  const [wireframeKind, setWireframeKind] = useState<WireframeKindChoice>(null);
  const [brandSource, setBrandSource] = useState<BrandSourceChoice>(null);
  const [hasBrandKit, setHasBrandKit] = useState(false);
  const [screens, setScreens] = useState(seedScreens);
  const [generatedAtLabel, setGeneratedAtLabel] = useState(MOCK_WIREFRAMES_GENERATED_AT_LABEL);
  const selectedCount = screens.filter((screen) => screen.selected).length;

  useEffect(() => {
    if (!wireframesTab.data?.tabData) {
      return;
    }

    const { tabData } = wireframesTab.data;
    setScreens(tabData.configureScreens);
    setGeneratedAtLabel(tabData.generatedAtLabel);
  }, [wireframesTab.data]);

  function continueFromSource(source: BrandSource) {
    setBrandSource(source);
    if (source === "brand-kit") {
      setStep("brand-kit");
      return;
    }
    setStep("style-guide");
  }

  async function generateWireframes() {
    setStep("generating");
    try {
      const record = await wireframesTab.generateWireframes({
        wireframeKind: wireframeKind ?? "lofi",
        brandSource,
        screens,
      });
      setScreens(record.tabData.configureScreens);
      setGeneratedAtLabel(record.tabData.generatedAtLabel);
      setStep("results");
    } catch {
      setStep("configure");
    }
  }

  const generatedCards = useMemo(
    () => buildResultCards(screens, generatedAtLabel, WIREFRAMES_RESULTS_PREVIEW_LIMIT),
    [generatedAtLabel, screens],
  );

  return (
    <section className="w-full">
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
          onBack={() => {
            setBrandSource(null);
            setStep("choose-type");
          }}
          onContinue={() => setStep("configure")}
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
          onConvert={() => {
            setWireframeKind("hifi");
            setStep("brand-kit");
          }}
        />
      ) : null}
    </section>
  );
}
