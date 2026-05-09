import { useCallback, useState } from "react";
import type { CompanionState } from "@shared/models/desktop";
import { useDesktopBridge } from "./useDesktopBridge";

export function useCompanionState(initialState: CompanionState = "idle") {
  const desktop = useDesktopBridge();
  const [state, setState] = useState<CompanionState>(initialState);

  const updateState = useCallback(async (nextState: CompanionState) => {
    setState(nextState);
    await desktop.companion.setState(nextState);
  }, [desktop]);

  return {
    state,
    setState: updateState,
  };
}
