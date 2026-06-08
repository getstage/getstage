import { Suspense, lazy, useEffect, type ReactNode } from "react";
import type { CompanionState } from "@shared/models/desktop";
import { CompanionOrb } from "@/components/companion/CompanionOrb";
import { useCompanionState } from "@/hooks/useCompanionState";
import {
  STAGE_SHORTCUT_OPEN_CHAT,
  STAGE_SHORTCUT_TOGGLE_VOICE,
} from "@/lib/companion/shortcutEvents";

const CritiquePanel = lazy(() =>
  import("@/components/companion/CritiquePanel").then((module) => ({
    default: module.CritiquePanel,
  })),
);
const VoiceControlBar = lazy(() =>
  import("@/components/companion/VoiceControlBar").then((module) => ({
    default: module.VoiceControlBar,
  })),
);

type DesktopShellProps = {
  children: ReactNode;
  hideCompanion?: boolean;
};

const SHORTCUT_DEBOUNCE_MS = 400;

export function DesktopShell({ children, hideCompanion = false }: DesktopShellProps) {
  const isCompanionWindow = new URLSearchParams(window.location.search).get("stageWindow") === "companion";
  const companion = useCompanionState(isCompanionWindow ? "listening" : "idle");

  useEffect(() => {
    if (isCompanionWindow) {
      return;
    }

    let lastVoiceShortcutAt = 0;
    let lastChatShortcutAt = 0;

    const unsubscribeVoice =
      window.stageDesktop?.voice?.onStartStopRecordingShortcut?.(() => {
        const now = Date.now();
        if (now - lastVoiceShortcutAt < SHORTCUT_DEBOUNCE_MS) {
          return;
        }

        lastVoiceShortcutAt = now;
        window.dispatchEvent(new CustomEvent(STAGE_SHORTCUT_TOGGLE_VOICE));
      }) ?? (() => {});

    const unsubscribeChat =
      window.stageDesktop?.voice?.onOpenLatestChatShortcut?.(() => {
        const now = Date.now();
        if (now - lastChatShortcutAt < SHORTCUT_DEBOUNCE_MS) {
          return;
        }

        lastChatShortcutAt = now;
        window.dispatchEvent(new CustomEvent(STAGE_SHORTCUT_OPEN_CHAT));
      }) ?? (() => {});

    return () => {
      unsubscribeVoice();
      unsubscribeChat();
    };
  }, [isCompanionWindow]);

  useEffect(() => {
    let isInteractive = false;

    function setInteractive(nextInteractive: boolean) {
      if (!isCompanionWindow) {
        return;
      }

      if (nextInteractive === isInteractive) {
        return;
      }

      isInteractive = nextInteractive;
      void window.stageDesktop.companion.setInteractive(nextInteractive);
    }

    function handlePointerMove(event: PointerEvent) {
      const target = document.elementFromPoint(event.clientX, event.clientY);

      setInteractive(Boolean(target?.closest(".voice-control-bar, .chat-panel")));
    }

    function handleCompanionOpen() {
      void companion.setState("listening");
    }

    if (isCompanionWindow) {
      setInteractive(false);
      window.addEventListener("pointermove", handlePointerMove);
    }

    window.addEventListener("stage-companion-open", handleCompanionOpen);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("stage-companion-open", handleCompanionOpen);
      if (isCompanionWindow) {
        void window.stageDesktop.companion.setInteractive(true);
      }
    };
  }, [companion.setState, isCompanionWindow]);

  if (isCompanionWindow) {
    async function setCompanionPanelState(nextState: CompanionState) {
      await companion.setState(nextState);

      if (nextState === "idle") {
        await window.stageDesktop.companion.hide();
      }
    }

    async function setCompanionChatState(nextState: CompanionState) {
      await companion.setState(nextState === "idle" ? "listening" : nextState);
    }

    return (
      <div className="stage-companion-window">
        <Suspense fallback={null}>
          <VoiceControlBar state={companion.state} onStateChange={setCompanionPanelState} />
          <CritiquePanel state={companion.state} onStateChange={setCompanionChatState} />
        </Suspense>
      </div>
    );
  }

  return (
    <div className="stage-desktop-shell min-h-dvh">
      {children}
      {!hideCompanion ? (
        <>
          <CompanionOrb state={companion.state} />
          <Suspense fallback={null}>
            <VoiceControlBar state={companion.state} onStateChange={companion.setState} />
            <CritiquePanel state={companion.state} onStateChange={companion.setState} />
          </Suspense>
        </>
      ) : null}
    </div>
  );
}
