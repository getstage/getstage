import type { ReactNode } from "react";
import { CompanionOrb } from "../companion/CompanionOrb";
import { CritiquePanel } from "../companion/CritiquePanel";
import { VoiceControlBar } from "../companion/VoiceControlBar";
import { useCompanionState } from "../hooks/useCompanionState";

type DesktopShellProps = {
  children: ReactNode;
};

export function DesktopShell({ children }: DesktopShellProps) {
  const companion = useCompanionState();

  return (
    <div className="stage-desktop-shell min-h-dvh">
      {children}
      <CompanionOrb state={companion.state} />
      <VoiceControlBar state={companion.state} onStateChange={companion.setState} />
      <CritiquePanel state={companion.state} onStateChange={companion.setState} />
    </div>
  );
}
