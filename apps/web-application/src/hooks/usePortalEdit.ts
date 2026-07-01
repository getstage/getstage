import { useMutation as useConvexMutation, useQuery as useConvexQuery } from "convex/react";
import type { Id } from "@stage/data-ops/convex/data-model";
import { api } from "@/lib/convex";

export function usePortalEdit(shareToken: string, isPreview: boolean) {
  const access = useConvexQuery(
    api.portal.getCollaboratorAccess,
    isPreview ? "skip" : { shareToken },
  );
  const canEdit = false;
  const user = access?.user ?? null;
  const requestTaskRevision = useConvexMutation(api.portal.requestTaskRevision);

  async function toggleTask(taskId: string) {
    void taskId;
  }

  async function addTask(phaseId: string, title: string) {
    void phaseId;
    void title;
  }

  async function updateTask(
    taskId: string,
    fields: { title?: string; content?: string },
  ) {
    void taskId;
    void fields;
  }

  // Move a task into the Revision column with the client's thoughts. Disabled in
  // preview, where there is no real project to write to.
  async function requestRevision(taskId: string, note: string) {
    if (isPreview) return;
    await requestTaskRevision({
      shareToken,
      taskId: taskId as Id<"tasks">,
      note,
    });
  }

  return { canEdit, user, toggleTask, addTask, updateTask, requestRevision };
}
