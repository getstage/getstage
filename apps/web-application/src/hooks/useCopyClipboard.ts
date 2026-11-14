import { useCallback, useEffect, useState } from "react";

export function useCopyClipboard() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    if (!copiedKey) return;
    const t = window.setTimeout(() => setCopiedKey(null), 1800);
    return () => window.clearTimeout(t);
  }, [copiedKey]);

  const copy = useCallback(async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      return true;
    } catch {
      setCopiedKey(null);
      return false;
    }
  }, []);

  return { copiedKey, copy };
}
