import { useCallback, useEffect, useRef, useState } from "react";

export function useActionError(timeoutMs: number = 3000) {
  const [actionError, setActionError] = useState<string | null>(null);
  const timerRef = useRef<number | undefined>(undefined);

  const showError = useCallback(
    (message: string) => {
      setActionError(message);

      if (timerRef.current !== undefined) {
        window.clearTimeout(timerRef.current);
      }

      timerRef.current = window.setTimeout(() => {
        setActionError(null);
      }, timeoutMs);
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

  return { actionError, showError };
}
