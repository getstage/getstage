import { useMemo, useState } from "react";
import { MOCK_SCREENS } from "../../../data/fixtures/wireframesTabFixtures";
import type { WireframeKind, WireframeStep } from "../../../types/wireframesTab";
import { BrandKitStep } from "./BrandKitStep";
import { CanvasShell } from "./CanvasShell";
import { ConfigureStep } from "./ConfigureStep";
import { GeneratingStep } from "./GeneratingStep";
import { ResultsGrid } from "./ResultsGrid";
import { TypeChooser } from "./TypeChooser";

export function WireframesTab() {
  const [step, setStep] = useState<WireframeStep>("choose-type");
  const [wireframeKind, setWireframeKind] = useState<WireframeKind | null>(null);
  const [hasBrandKit, setHasBrandKit] = useState(false);
  const [screens, setScreens] = useState(MOCK_SCREENS);
  const selectedCount = screens.filter((screen) => screen.selected).length;

  function selectKind(nextKind: WireframeKind) {
    setWireframeKind(nextKind);
  }

  function continueFromType() {
    if (!wireframeKind) return;
    if (wireframeKind === "hifi") {
      setStep("brand-kit");
      return;
    }
    setStep("configure");
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
            selectedKind={wireframeKind}
            onSelect={selectKind}
            onContinue={continueFromType}
          />
        </CanvasShell>
      ) : null}

      {step === "brand-kit" ? (
        <CanvasShell centered>
          <BrandKitStep
            hasBrandKit={hasBrandKit}
            onUpload={() => setHasBrandKit(true)}
            onRemove={() => setHasBrandKit(false)}
            onBack={() => setStep("choose-type")}
            onContinue={() => setStep("configure")}
          />
        </CanvasShell>
      ) : null}

      {step === "configure" ? (
        <ConfigureStep
          wireframeKind={wireframeKind ?? "lofi"}
          screens={screens}
          selectedCount={selectedCount}
          onChangeType={() => setStep("choose-type")}
          onAddBrandKit={() => {
            setWireframeKind("hifi");
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
