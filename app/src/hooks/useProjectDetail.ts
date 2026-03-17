import { useNavigate } from "@tanstack/react-router";
import { useActionError } from "@/hooks/useActionError";
import { useProjectDetailQuery } from "@/features/project-detail/useProjectDetailQuery";
import { useProjectDialogs } from "@/features/project-detail/useProjectDialogs";
import { useProjectTaskActions } from "@/features/project-detail/useProjectTaskActions";
import { useShareLink } from "@/features/project-detail/useShareLink";
import type { Id } from "../../convex/_generated/dataModel";

export function useProjectDetail(projectId: Id<"projects">) {
  const navigate = useNavigate();
  const { actionError, showError } = useActionError();
  const query = useProjectDetailQuery(projectId);
  const tasks = useProjectTaskActions({
    currentPhaseId: query.currentPhase?.id as Id<"phases"> | undefined,
    showError,
  });
  const dialogs = useProjectDialogs({
    project: query.project,
    projectId,
    showError,
    onDeleteSuccess: () => {
      navigate({ to: "/dashboard" });
    },
  });
  const share = useShareLink({
    project: query.project,
    showError,
  });

  return {
    ...query,
    actionError,
    tasks,
    dialogs,
    share,
  };
}
