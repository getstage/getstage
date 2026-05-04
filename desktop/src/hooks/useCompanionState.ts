import { useState } from "react";
import type { CompanionState } from "@shared/models/desktop";
import { useDesktopBridge } from "./useDesktopBridge";

export function useCompanionState(initialState: CompanionState = "idle") {
  const desktop = useDesktopBridge();
  const [state, setState] = useState<CompanionState>(initialState);

  async function updateState(nextState: CompanionState) {
    setState(nextState);
    await desktop.companion.setState(nextState);
  }

  return {
    state,
    setState: updateState,
  };
}
