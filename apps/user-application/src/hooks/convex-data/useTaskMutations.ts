import type { Id } from "@stage/data-ops/convex/data-model";
import { useState } from "react";
import { useMutation } from "convex/react";
import {
  taskSummarySchema,
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
  priority?: TaskPriority;
  content?: string;
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

export type SetTaskPriorityInput = {
  taskId: string;
  priority: TaskPriority | null;
};

export type SetTaskAssigneesInput = {
  taskId: string;
  assigneeIds: string[];
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
