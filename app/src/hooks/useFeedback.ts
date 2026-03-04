import { useCallback, useEffect, useRef, useState } from "react";

export type SaveFeedback =
  | { kind: "idle" }
  | { kind: "saved" }
  | { kind: "error"; message: string };

export const IDLE_FEEDBACK: SaveFeedback = { kind: "idle" };
export const SAVED_FEEDBACK: SaveFeedback = { kind: "saved" };

export function useFeedback(timeoutMs: number = 2500) {
  const [feedback, setFeedback] = useState<SaveFeedback>(IDLE_FEEDBACK);
  const timerRef = useRef<number | undefined>(undefined);

  const showFeedback = useCallback(
    (nextFeedback: SaveFeedback) => {
      setFeedback(nextFeedback);

      if (timerRef.current !== undefined) {
        window.clearTimeout(timerRef.current);
      }

      if (nextFeedback.kind !== "idle") {
        timerRef.current = window.setTimeout(() => {
          setFeedback(IDLE_FEEDBACK);
        }, timeoutMs);
      }
    },
    [timeoutMs],
  );

  useEffect(() => {
    return () => {
      if (timerRef.current !== undefined) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  return { feedback, showFeedback };
}
