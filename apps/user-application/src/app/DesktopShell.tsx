import { useEffect, type ReactNode } from "react";
import type { CompanionState } from "@shared/models/desktop";
import { CompanionOrb } from "../companion/CompanionOrb";
import { CritiquePanel } from "../companion/CritiquePanel";
import { VoiceControlBar } from "../companion/VoiceControlBar";
import { useCompanionState } from "../hooks/useCompanionState";

type DesktopShellProps = {
  children: ReactNode;
};

export function DesktopShell({ children }: DesktopShellProps) {
  const companion = useCompanionState();

  useEffect(() => {
    function handleCompanionState(event: Event) {
      const nextState = (event as CustomEvent<CompanionState>).detail;

      void companion.setState(nextState);
    }

    window.addEventListener("stage-companion-state", handleCompanionState);

    return () => {
      window.removeEventListener("stage-companion-state", handleCompanionState);
    };
  }, [companion.setState]);

  return (
    <div className="stage-desktop-shell min-h-dvh">
      {children}
      <CompanionOrb state={companion.state} />
      <VoiceControlBar state={companion.state} onStateChange={companion.setState} />
      <CritiquePanel state={companion.state} onStateChange={companion.setState} />
    </div>
  );
}
