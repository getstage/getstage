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
