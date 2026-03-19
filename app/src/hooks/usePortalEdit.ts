import { useQuery as useConvexQuery } from "convex/react";
import { api } from "@/lib/convex";

export function usePortalEdit(shareToken: string, isPreview: boolean) {
  const access = useConvexQuery(
    api.portal.getCollaboratorAccess,
    isPreview ? "skip" : { shareToken },
  );
  const canEdit = false;
  const user = access?.user ?? null;

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

  return { canEdit, user, toggleTask, addTask, updateTask };
}
