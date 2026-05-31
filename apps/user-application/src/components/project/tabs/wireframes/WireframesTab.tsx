import { useMemo, useState } from "react";
import { MOCK_SCREENS } from "@/data/fixtures/project/wireframesTabFixtures";
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

export function WireframesTab() {
  const [step, setStep] = useState<WireframeStep>("choose-kind");
  const [wireframeKind, setWireframeKind] = useState<WireframeKindChoice>(null);
  const [brandSource, setBrandSource] = useState<BrandSourceChoice>(null);
  const [hasBrandKit, setHasBrandKit] = useState(false);
  const [screens, setScreens] = useState(MOCK_SCREENS);
  const selectedCount = screens.filter((screen) => screen.selected).length;

  function continueFromSource(source: BrandSource) {
    setBrandSource(source);
    if (source === "brand-kit") {
      setStep("brand-kit");
      return;
    }
    setStep("style-guide");
  }

  function generateWireframes() {
    setStep("generating");
    window.setTimeout(() => {
      setStep("results");
    }, 1300);
  }

  const generatedCards = useMemo(
    () =>
      screens
        .filter((screen) => screen.selected)
        .slice(0, 6)
        .map((screen) => ({
          ...screen,
          date: "6th April, 2025",
        })),
    [screens],
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
          onGenerate={generateWireframes}
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
