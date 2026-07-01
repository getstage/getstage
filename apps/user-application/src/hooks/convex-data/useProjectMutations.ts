import { useState } from "react";
import { useMutation } from "convex/react";
import type { Id } from "@stage/data-ops/convex/data-model";
import { useDesktopAuth } from "@/lib/auth";
import { api } from "@/lib/convexApi";

function requireDesktopAuth(isAuthenticated: boolean) {
  if (!isAuthenticated) {
    throw new Error("Sign in to Stage before changing projects.");
  }
}

export type UpdateProjectInput = {
  projectId: string;
  name?: string;
  clientName?: string;
  clientEmail?: string | null;
  clientAvatarUrl?: string | null;
  projectImageUrl?: string | null;
  startDate?: number;
  endDate?: number;
  status?: "active" | "paused" | "completed";
  enabledSteps?: string[];
};

export function useUpdateProjectMutation() {
  const updateProject = useMutation(api.projects.update);
  const { isAuthenticated } = useDesktopAuth();
  const [isPending, setIsPending] = useState(false);

  async function mutateAsync(input: UpdateProjectInput) {
    requireDesktopAuth(isAuthenticated);
    setIsPending(true);
    try {
      return updateProject({
        ...input,
        projectId: input.projectId as Id<"projects">,
      });
    } finally {
      setIsPending(false);
    }
  }

  return {
    isPending,
    mutateAsync,
    mutate: (input: UpdateProjectInput, options?: { onError?: () => void }) => {
      void mutateAsync(input).catch(() => options?.onError?.());
    },
  };
}

export type SyncProjectPhasesInput = {
  projectId: string;
  phases: Array<{ id?: string; name: string }>;
  deleteTasksInRemovedPhases?: boolean;
};

export function useSyncProjectPhasesMutation() {
  const syncPhases = useMutation(api.projects.syncPhases);
  const { isAuthenticated } = useDesktopAuth();
  const [isPending, setIsPending] = useState(false);

  async function mutateAsync(input: SyncProjectPhasesInput) {
    requireDesktopAuth(isAuthenticated);
    setIsPending(true);
    try {
      return syncPhases({
        projectId: input.projectId as Id<"projects">,
        deleteTasksInRemovedPhases: input.deleteTasksInRemovedPhases,
        phases: input.phases.map((phase) => ({
          name: phase.name,
          ...(phase.id ? { id: phase.id as Id<"phases"> } : {}),
        })),
      });
    } finally {
      setIsPending(false);
    }
  }

  return {
    isPending,
    mutateAsync,
    mutate: (input: SyncProjectPhasesInput, options?: { onError?: () => void }) => {
      void mutateAsync(input).catch(() => options?.onError?.());
    },
  };
}

export function useDeleteProjectMutation() {
  const deleteProject = useMutation(api.projects.deleteById);
  const { isAuthenticated } = useDesktopAuth();
  const [isPending, setIsPending] = useState(false);

  async function mutateAsync(projectId: string) {
    requireDesktopAuth(isAuthenticated);
    setIsPending(true);
    try {
      return deleteProject({ projectId: projectId as Id<"projects"> });
    } finally {
      setIsPending(false);
    }
  }

  return {
    isPending,
    mutateAsync,
    mutate: (projectId: string, options?: { onError?: () => void }) => {
      void mutateAsync(projectId).catch(() => options?.onError?.());
    },
  };
}
