import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/lib/convexApi";
import type { Id } from "@stage/data-ops/convex/data-model";
import type { StyleGuideEdit, StyleGuideSection, StyleGuideSpec } from "@stage/data-ops/contracts";

const SAVE_DELAY_MS = 500;

export type StyleGuideSaveState = { kind: "saved" } | { kind: "saving" } | { kind: "failed"; message: string };

type Pending = Partial<StyleGuideSpec>;

/**
 * Autosaves each Style Guide section on its own, so teammates working in different
 * sections never overwrite each other. Local edits show instantly; the live Convex
 * query brings in everyone else's. A failed save keeps the local edit.
 */
export function useStyleGuideEditor(projectId: string, directionId: string, serverSpec: StyleGuideSpec) {
  const editStyleGuide = useMutation(api.projectAi.editStyleGuide);
  const [pending, setPending] = useState<Pending>({});
  const [saveState, setSaveState] = useState<StyleGuideSaveState>({ kind: "saved" });
  const timers = useRef(new Map<StyleGuideSection, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    const active = timers.current;
    return () => active.forEach(clearTimeout);
  }, []);

  const send = useCallback(
    async (edit: StyleGuideEdit) => {
      setSaveState({ kind: "saving" });
      try {
        await editStyleGuide({
          projectId: projectId as Id<"projects">,
          directionId,
          editJson: JSON.stringify(edit),
        });
        setPending((current) => {
          if (edit.kind === "reset") return {};
          const { [edit.section]: _saved, ...rest } = current;
          return rest;
        });
        setSaveState({ kind: "saved" });
      } catch (caught) {
        setSaveState({ kind: "failed", message: caught instanceof Error ? caught.message : "Could not save." });
      }
    },
    [directionId, editStyleGuide, projectId],
  );

  const update = useCallback(
    <S extends StyleGuideSection>(section: S, value: StyleGuideSpec[S]) => {
      setPending((current) => ({ ...current, [section]: value }));
      setSaveState({ kind: "saving" });
      clearTimeout(timers.current.get(section));
      timers.current.set(
        section,
        setTimeout(() => {
          timers.current.delete(section);
          void send({ kind: "section", section, value });
        }, SAVE_DELAY_MS),
      );
    },
    [send],
  );

  const resetToGenerated = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current.clear();
    void send({ kind: "reset" });
  }, [send]);

  return { spec: { ...serverSpec, ...pending }, update, resetToGenerated, saveState };
}
