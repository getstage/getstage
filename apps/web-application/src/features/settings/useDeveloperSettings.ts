import { useCallback, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/lib/convex";

type Feedback = { kind: "idle" } | { kind: "success"; message: string } | { kind: "error"; message: string };

export function useDeveloperSettings({ enabled }: { enabled: boolean }) {
  const keys = useQuery(api.developer.apiKeys.list, enabled ? {} : "skip");
  const generateKey = useMutation(api.developer.apiKeys.generate);
  const revokeKey = useMutation(api.developer.apiKeys.revoke);

  const [keyName, setKeyName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isRevoking, setIsRevoking] = useState<string | null>(null);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback>({ kind: "idle" });
  const [copied, setCopied] = useState(false);

  const handleCreate = useCallback(async () => {
    const trimmed = keyName.trim();
    if (!trimmed) {
      setFeedback({ kind: "error", message: "Enter a name for this key." });
      return;
    }

    setIsCreating(true);
    setFeedback({ kind: "idle" });
    try {
      const result = await generateKey({ name: trimmed });
      setRevealedKey(result.key);
      setKeyName("");
      setFeedback({ kind: "success", message: "Key created. Copy it now — it won't be shown again." });
    } catch (error) {
      setFeedback({
        kind: "error",
        message: error instanceof Error ? error.message : "Failed to create key.",
      });
    } finally {
      setIsCreating(false);
    }
  }, [keyName, generateKey]);

  const handleRevoke = useCallback(async (keyId: string) => {
    setIsRevoking(keyId);
    setFeedback({ kind: "idle" });
    try {
      await revokeKey({ keyId: keyId as Parameters<typeof revokeKey>[0]["keyId"] });
      setFeedback({ kind: "success", message: "Key revoked." });
    } catch (error) {
      setFeedback({
        kind: "error",
        message: error instanceof Error ? error.message : "Failed to revoke key.",
      });
    } finally {
      setIsRevoking(null);
    }
  }, [revokeKey]);

  const handleCopyKey = useCallback(async () => {
    if (!revealedKey) return;
    try {
      await navigator.clipboard.writeText(revealedKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setFeedback({ kind: "error", message: "Failed to copy. Select the key manually." });
    }
  }, [revealedKey]);

  const dismissRevealedKey = useCallback(() => {
    setRevealedKey(null);
    setCopied(false);
  }, []);

  return {
    keys: keys ?? [],
    keyName,
    setKeyName,
    isCreating,
    isRevoking,
    revealedKey,
    copied,
    feedback,
    handleCreate,
    handleRevoke,
    handleCopyKey,
    dismissRevealedKey,
  };
}
