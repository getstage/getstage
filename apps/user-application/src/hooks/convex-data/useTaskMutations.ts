import type { Id } from "@stage/data-ops/convex/data-model";
import { useState } from "react";
import { useMutation } from "convex/react";
import {
  taskSummarySchema,
  type TaskBoardStatus,
  type TaskPriority,
} from "@stage/data-ops";
import { useDesktopAuth } from "@/lib/auth";
import { api } from "@/lib/convexApi";

function requireDesktopAuth(isAuthenticated: boolean) {
  if (!isAuthenticated) {
    throw new Error("Sign in to Stage before changing tasks.");
  }
}

export type CreateTaskInput = {
  projectId: string;
  title: string;
  phaseId?: string;
  priority?: TaskPriority;
  summary?: string;
  content?: string;
  boardStatus?: TaskBoardStatus;
};

export function useCreateTaskMutation() {
  const createTask = useMutation(api.desktop.createTask);
  const { isAuthenticated } = useDesktopAuth();
  const [isPending, setIsPending] = useState(false);

  async function mutateAsync(input: CreateTaskInput) {
    requireDesktopAuth(isAuthenticated);
    setIsPending(true);
    try {
      return taskSummarySchema.parse(await createTask(input));
    } finally {
      setIsPending(false);
    }
  }

  return {
    isPending,
    mutateAsync,
    mutate: (input: CreateTaskInput, options?: { onError?: () => void }) => {
      void mutateAsync(input)
        .catch(() => options?.onError?.());
    },
  };
}

export function useDeleteTaskMutation() {
  const deleteTask = useMutation(api.desktop.deleteTask);
  const { isAuthenticated } = useDesktopAuth();
  const [isPending, setIsPending] = useState(false);

  async function mutateAsync(taskId: string) {
    requireDesktopAuth(isAuthenticated);
    setIsPending(true);
    try {
      return deleteTask({ taskId });
    } finally {
      setIsPending(false);
    }
  }

  return {
    isPending,
    mutateAsync,
    mutate: (taskId: string, options?: { onError?: () => void }) => {
      void mutateAsync(taskId).catch(() => options?.onError?.());
    },
  };
}

export function useToggleTaskCompletionMutation() {
  const toggleTaskCompletion = useMutation(api.tasks.toggleComplete);
  const { isAuthenticated } = useDesktopAuth();
  const [isPending, setIsPending] = useState(false);

  async function mutateAsync(taskId: string) {
    requireDesktopAuth(isAuthenticated);
    setIsPending(true);
    try {
      return toggleTaskCompletion({
        taskId: taskId as Id<"tasks">,
      });
    } finally {
      setIsPending(false);
    }
  }

  return {
    isPending,
    mutateAsync,
    mutate: (taskId: string, options?: { onError?: () => void }) => {
      void mutateAsync(taskId).catch(() => options?.onError?.());
    },
  };
}

export type SetTaskPriorityInput = {
  taskId: string;
  priority: TaskPriority | null;
};

export type SetTaskAssigneesInput = {
  taskId: string;
  assigneeIds: string[];
};

export type SetTaskPhaseInput = {
  taskId: string;
  phaseId: string;
};

export function useSetTaskAssigneesMutation() {
  const setAssignees = useMutation(api.tasks.setAssignees);
  const { isAuthenticated } = useDesktopAuth();
  const [isPending, setIsPending] = useState(false);

  async function mutateAsync(input: SetTaskAssigneesInput) {
    requireDesktopAuth(isAuthenticated);
    setIsPending(true);
    try {
      return setAssignees({
        taskId: input.taskId as Id<"tasks">,
        assigneeIds: input.assigneeIds,
      });
    } finally {
      setIsPending(false);
    }
  }

  return {
    isPending,
    mutateAsync,
    mutate: (input: SetTaskAssigneesInput, options?: { onError?: () => void }) => {
      void mutateAsync(input).catch(() => options?.onError?.());
    },
  };
}

export function useSetTaskPhaseMutation() {
  const setPhase = useMutation(api.tasks.setPhase);
  const { isAuthenticated } = useDesktopAuth();
  const [isPending, setIsPending] = useState(false);

  async function mutateAsync(input: SetTaskPhaseInput) {
    requireDesktopAuth(isAuthenticated);
    setIsPending(true);
    try {
      return setPhase({
        taskId: input.taskId as Id<"tasks">,
        phaseId: input.phaseId as Id<"phases">,
      });
    } finally {
      setIsPending(false);
    }
  }

  return {
    isPending,
    mutateAsync,
    mutate: (input: SetTaskPhaseInput, options?: { onError?: () => void }) => {
      void mutateAsync(input).catch(() => options?.onError?.());
    },
  };
}

export type SetTaskKanbanColumnInput = {
  taskId: string;
  boardStatus: TaskBoardStatus;
};

export function useSetTaskKanbanColumnMutation() {
  const setTaskKanbanColumn = useMutation(api.desktop.setTaskKanbanColumn);
  const { isAuthenticated } = useDesktopAuth();
  const [isPending, setIsPending] = useState(false);

  async function mutateAsync(input: SetTaskKanbanColumnInput) {
    requireDesktopAuth(isAuthenticated);
    setIsPending(true);
    try {
      return taskSummarySchema.parse(await setTaskKanbanColumn(input));
    } finally {
      setIsPending(false);
    }
  }

  return {
    isPending,
    mutateAsync,
    mutate: (input: SetTaskKanbanColumnInput, options?: { onError?: () => void }) => {
      void mutateAsync(input).catch(() => options?.onError?.());
    },
  };
}

export type UpdateTaskInput = {
  taskId: string;
  title?: string;
  summary?: string;
  content?: string;
};

export function useUpdateTaskMutation() {
  const updateTask = useMutation(api.tasks.update);
  const { isAuthenticated } = useDesktopAuth();
  const [isPending, setIsPending] = useState(false);

  async function mutateAsync(input: UpdateTaskInput) {
    requireDesktopAuth(isAuthenticated);
    setIsPending(true);
    try {
      await updateTask({
        taskId: input.taskId as Id<"tasks">,
        title: input.title,
        summary: input.summary,
        content: input.content,
      });
    } finally {
      setIsPending(false);
    }
  }

  return {
    isPending,
    mutateAsync,
    mutate: (input: UpdateTaskInput, options?: { onError?: () => void }) => {
      void mutateAsync(input).catch(() => options?.onError?.());
    },
  };
}

export function useSetTaskPriorityMutation() {
  const setTaskPriority = useMutation(api.desktop.setTaskPriority);
  const { isAuthenticated } = useDesktopAuth();
  const [isPending, setIsPending] = useState(false);

  async function mutateAsync(input: SetTaskPriorityInput) {
    requireDesktopAuth(isAuthenticated);
    setIsPending(true);
    try {
      return taskSummarySchema.parse(await setTaskPriority(input));
    } finally {
      setIsPending(false);
    }
  }

  return {
    isPending,
    mutateAsync,
    mutate: (input: SetTaskPriorityInput, options?: { onError?: () => void }) => {
      void mutateAsync(input)
        .catch(() => options?.onError?.());
    },
  };
}
