import { useQuery as useConvexQuery, useMutation } from "convex/react";
import { api } from "@/lib/convex";
import type { Id } from "../../convex/_generated/dataModel";

export function usePortalEdit(shareToken: string, isPreview: boolean) {
  const access = useConvexQuery(
    api.portal.getCollaboratorAccess,
    isPreview ? "skip" : { shareToken },
  );

  const toggleCompleteMutation = useMutation(api.tasks.toggleComplete);
  const createTaskMutation = useMutation(api.tasks.create);
  const updateTaskMutation = useMutation(api.tasks.update);

  const canEdit = access?.canEdit ?? false;
  const user = access?.user ?? null;

  async function toggleTask(taskId: string) {
    await toggleCompleteMutation({ taskId: taskId as Id<"tasks"> });
  }

  async function addTask(phaseId: string, title: string) {
    await createTaskMutation({
      phaseId: phaseId as Id<"phases">,
      title,
    });
  }

  async function updateTask(
    taskId: string,
    fields: { title?: string; content?: string },
  ) {
    await updateTaskMutation({
      taskId: taskId as Id<"tasks">,
      ...fields,
    });
  }

  return { canEdit, user, toggleTask, addTask, updateTask };
}
