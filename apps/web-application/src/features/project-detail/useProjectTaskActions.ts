import { useEffect, useRef, useState } from "react";
import { useMutation as useConvexMutation } from "convex/react";
import { api } from "@/lib/convex";
import { toUserFacingErrorMessage } from "@/lib/errors";
import type { ProjectTaskController } from "@/features/project-detail/controllers";
import type { Id } from "../../../convex/_generated/dataModel";

type ProjectTaskActionsInput = {
  currentPhaseId?: Id<"phases">;
  showError: (message: string) => void;
};

export function useProjectTaskActions({
  currentPhaseId,
  showError,
}: ProjectTaskActionsInput): ProjectTaskController {
  const createTask = useConvexMutation(api.tasks.create);
  const deleteTask = useConvexMutation(api.tasks.deleteById);
  const toggleTaskComplete = useConvexMutation(api.tasks.toggleComplete);
  const addTaskInputRef = useRef<HTMLInputElement>(null);
  const [showAddTask, setShowAddTask] = useState(false);
  const [addTaskValue, setAddTaskValue] = useState("");

  useEffect(() => {
    if (!showAddTask) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      addTaskInputRef.current?.focus();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [showAddTask]);

  async function handleAddTaskSubmit() {
    const title = addTaskValue.trim();
    if (!currentPhaseId || !title) {
      return;
    }

    try {
      await createTask({ phaseId: currentPhaseId, title });
      setAddTaskValue("");
      setShowAddTask(false);
    } catch (error) {
      showError(toUserFacingErrorMessage(error, "Could not create the task."));
    }
  }

  async function handleToggleTask(taskId: Id<"tasks">) {
    try {
      await toggleTaskComplete({ taskId });
    } catch (error) {
      showError(toUserFacingErrorMessage(error, "Could not update the task."));
    }
  }

  async function handleDeleteTask(taskId: Id<"tasks">) {
    try {
      await deleteTask({ taskId });
    } catch (error) {
      showError(toUserFacingErrorMessage(error, "Could not delete the task."));
    }
  }

  return {
    addTaskInputRef,
    showAddTask,
    addTaskValue,
    setShowAddTask,
    setAddTaskValue,
    handleAddTaskSubmit,
    handleToggleTask,
    handleDeleteTask,
  };
}
