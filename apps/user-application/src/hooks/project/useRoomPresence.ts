import { useCallback, useEffect, useRef } from "react";
import { useMutation } from "convex/react";
import usePresence from "@convex-dev/presence/react";
import { api } from "@/lib/convexApi";

export type RoomMember = { userId: string; name: string; image?: string; focus?: string };

type MemberData = { name?: string; image?: string; focus?: string };

/**
 * Teammates currently in a collaborative project room (e.g. one Style Guide), and
 * where in it they are working. Signed-out viewers join nothing.
 */
export function useRoomPresence(roomId: string, userId: string | undefined) {
  const state = usePresence(api.presence, roomId, userId ?? "");
  const sendFocus = useMutation(api.presence.setFocus);
  const lastFocus = useRef<string | null>(null);

  const setFocus = useCallback(
    (focus: string) => {
      if (!userId || lastFocus.current === focus) return;
      lastFocus.current = focus;
      void sendFocus({ roomId, focus }).catch(() => {
        lastFocus.current = null;
      });
    },
    [roomId, sendFocus, userId],
  );

  // Publish name and avatar as soon as we join, before the first focus.
  useEffect(() => {
    lastFocus.current = null;
    setFocus("");
  }, [setFocus]);

  const others: RoomMember[] = (state ?? [])
    .filter((member) => member.online && member.userId !== userId)
    .map((member) => {
      const data = (member.data ?? {}) as MemberData;
      return { userId: member.userId, name: data.name ?? "Teammate", image: data.image, focus: data.focus };
    });

  return { others, setFocus };
}
