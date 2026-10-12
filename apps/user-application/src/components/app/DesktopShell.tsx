import { Suspense, lazy, useEffect, useRef, type ReactNode } from "react";
import type { CompanionState } from "@shared/models/desktop";
import { useStageWidgetVisibility } from "@/hooks/companion/useStageWidgetVisibility";
import { useCompanionState } from "@/hooks/useCompanionState";
import {
  STAGE_SHORTCUT_OPEN_CHAT,
  STAGE_CHAT_OPEN_REQUEST,
  STAGE_CHAT_FOCUS,
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
  forceHideCompanion?: boolean;
};

const SHORTCUT_DEBOUNCE_MS = 400;

export function DesktopShell({
  children,
  hideCompanion = false,
  forceHideCompanion = false,
}: DesktopShellProps) {
  const isCompanionWindow = new URLSearchParams(window.location.search).get("stageWindow") === "companion";
  const companion = useCompanionState("idle");
  const { enabled: allowStageWidgetEverywhere } = useStageWidgetVisibility();
  const companionStateRef = useRef(companion.state);
  companionStateRef.current = companion.state;
  const pendingVoiceShortcutRef = useRef(false);
  const pendingChatShortcutRef = useRef<typeof STAGE_SHORTCUT_OPEN_CHAT | typeof STAGE_CHAT_FOCUS | undefined>(undefined);
  useEffect(() => {
    if (isCompanionWindow) {
      return;
    }

    let lastVoiceShortcutAt = 0;
    let lastChatShortcutAt = 0;
    let cancelled = false;

    const unsubscribeVoice =
      window.stageDesktop?.voice?.onStartStopRecordingShortcut?.(() => {
        const now = Date.now();
        if (now - lastVoiceShortcutAt < SHORTCUT_DEBOUNCE_MS) {
          return;
        }

        lastVoiceShortcutAt = now;
        void import("@/components/companion/VoiceControlBar").then(() => {
          if (cancelled) {
            return;
          }

          pendingVoiceShortcutRef.current = true;
          if (companionStateRef.current === "idle") {
            void companion.setState("listening");
          }
        });
      }) ?? (() => {});

    function requestChat(eventName: typeof STAGE_SHORTCUT_OPEN_CHAT | typeof STAGE_CHAT_FOCUS = STAGE_SHORTCUT_OPEN_CHAT) {
      const now = Date.now();
      if (now - lastChatShortcutAt < SHORTCUT_DEBOUNCE_MS) return;
      lastChatShortcutAt = now;
      void import("@/components/companion/CritiquePanel").then(() => {
        if (cancelled) return;
        if (companionStateRef.current === "response" || companionStateRef.current === "thinking") {
          window.dispatchEvent(new CustomEvent(eventName));
          return;
        }
        pendingChatShortcutRef.current = eventName;
        void companion.setState("response");
      });
    }
    const unsubscribeChat = window.stageDesktop?.voice?.onOpenLatestChatShortcut?.(() => requestChat()) ?? (() => {});
    const requestCanvasChat = () => requestChat(STAGE_CHAT_FOCUS);
    window.addEventListener(STAGE_CHAT_OPEN_REQUEST, requestCanvasChat);

    return () => {
      cancelled = true;
      unsubscribeVoice();
      unsubscribeChat();
      window.removeEventListener(STAGE_CHAT_OPEN_REQUEST, requestCanvasChat);
    };
  }, [companion.setState, isCompanionWindow]);

  useEffect(() => {
    if (
      isCompanionWindow ||
      (!pendingVoiceShortcutRef.current && !pendingChatShortcutRef.current)
    ) {
      return;
    }

    let cancelled = false;
    const frameId = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (cancelled) {
          return;
        }

        if (pendingVoiceShortcutRef.current) {
          pendingVoiceShortcutRef.current = false;
          window.dispatchEvent(new CustomEvent(STAGE_SHORTCUT_TOGGLE_VOICE));
        }

        if (pendingChatShortcutRef.current) {
          const eventName = pendingChatShortcutRef.current;
          pendingChatShortcutRef.current = undefined;
          window.dispatchEvent(new CustomEvent(eventName));
        }
      });
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frameId);
    };
  }, [companion.state, isCompanionWindow]);

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
      // STA-7: closing chat must not remap idle → listening (that left the static expanded bar).
      await companion.setState(nextState);
      if (nextState === "idle") {
        await window.stageDesktop.companion.hide();
      }
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
      {!forceHideCompanion && (!hideCompanion || allowStageWidgetEverywhere || companion.state === "response" || companion.state === "thinking") ? (
        <>
          <Suspense fallback={null}>
            <VoiceControlBar state={companion.state} onStateChange={companion.setState} />
            <CritiquePanel state={companion.state} onStateChange={companion.setState} />
          </Suspense>
        </>
      ) : null}
    </div>
  );
}
