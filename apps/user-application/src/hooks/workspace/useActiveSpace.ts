import { useQuery } from "convex/react";
import { useEffect, useSyncExternalStore } from "react";
import { useDesktopAuth } from "@/lib/auth";
import { api } from "@/lib/convexApi";
import {
  clearActiveSpaceOwnerId,
  getActiveSpaceOwnerId,
  setActiveSpaceOwnerId,
  subscribeActiveSpace,
} from "@/lib/workspace/activeSpace";

export function useActiveSpace() {
  const { isAuthenticated } = useDesktopAuth();
  const spaces = useQuery(api.workspaceMembers.listSpaces, isAuthenticated ? {} : "skip");
  const storedId = useSyncExternalStore(subscribeActiveSpace, getActiveSpaceOwnerId, () => null);
  const list = [...(spaces ?? [])].sort(
    (left, right) => Number(left.role === "owner") - Number(right.role === "owner"),
  );
  const defaultId = list[0]?.ownerUserId ?? null;
  const activeId =
    storedId && list.some((space) => space.ownerUserId === storedId) ? storedId : defaultId;

  useEffect(() => {
    if (spaces === undefined) return;
    const stored = getActiveSpaceOwnerId();
    const valid = Boolean(stored && spaces.some((space) => space.ownerUserId === stored));
    if (spaces.length < 2) {
      if (stored) clearActiveSpaceOwnerId();
      return;
    }
    const first = [...spaces].sort(
      (left, right) => Number(left.role === "owner") - Number(right.role === "owner"),
    )[0];
    if (!valid && first) setActiveSpaceOwnerId(first.ownerUserId);
  }, [spaces]);

  return {
    spaces: list,
    spacesReady: spaces !== undefined,
    activeId,
    setActiveSpaceOwnerId,
  };
}
