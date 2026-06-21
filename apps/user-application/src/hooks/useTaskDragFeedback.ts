import { useEffect } from "react";

const TASK_DRAGGING_CLASS = "stage-task-dragging";

export function useTaskDragFeedback(isDragging: boolean) {
  useEffect(() => {
    if (!isDragging) return;

    document.documentElement.classList.add(TASK_DRAGGING_CLASS);
    return () => document.documentElement.classList.remove(TASK_DRAGGING_CLASS);
  }, [isDragging]);
}
