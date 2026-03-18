import { Helmet } from "react-helmet-async";
import { Link, useParams } from "@tanstack/react-router";
import { motion } from "motion/react";
import { ArrowLeft } from "@phosphor-icons/react";
import { ProjectDock } from "@/components/dashboard/ProjectDock";
import { ProjectDialogs } from "@/components/project/ProjectDialogs";
import { ProjectHeader } from "@/components/project/ProjectHeader";
import { PhaseNavigation } from "@/components/project/PhaseNavigation";
import { TaskChecklist } from "@/components/project/TaskChecklist";
import { useDockProjects } from "@/hooks/useDockProjects";
import { useProjectDetail } from "@/hooks/useProjectDetail";
import type { Id } from "../../../convex/_generated/dataModel";

export function ProjectDetailPage() {
  const { id } = useParams({ from: "/_authed/project/$id" });
  const projectId = id as Id<"projects">;
  const detail = useProjectDetail(projectId);
  const dockProjects = useDockProjects();

  if (detail.isLoading) {
    return <ProjectDetailLoadingState />;
  }

  if (!detail.project || !detail.currentPhase) {
    return <ProjectNotFoundState />;
  }

  return (
    <>
      <Helmet>
        <title>{detail.project.name} — Stage</title>
      </Helmet>

      <div className="min-h-[calc(100vh-64px)]">
        <motion.main
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mx-auto flex w-full max-w-[1200px] flex-col px-6 pb-[120px] pt-6 sm:px-10 lg:px-14"
        >
          <Link
            to="/dashboard"
            className="mb-2 inline-flex w-fit items-center gap-1 text-[13px] text-text-secondary transition-colors hover:text-text-primary"
          >
            <ArrowLeft size={14} />
            Dashboard
          </Link>

          <ProjectHeader
            project={detail.project}
            onShare={() => detail.share.setOpen(true)}
            onEditName={detail.dialogs.openEditNameDialog}
            onEditClient={detail.dialogs.openEditClientDialog}
            onAdjustTimeline={detail.dialogs.openTimelineDialog}
            onEditPhases={detail.dialogs.openPhasesDialog}
            onTogglePaused={() => void detail.dialogs.handleToggleProjectPaused()}
            onDelete={() => detail.dialogs.setOpen("deleteConfirm", true)}
          />

          <PhaseNavigation
            phases={detail.project.phases}
            activePhaseId={detail.currentPhase.id}
            onSelect={detail.setActivePhaseId}
          />

          <TaskChecklist
            phase={detail.currentPhase}
            projectId={detail.project.id}
            actionError={detail.actionError}
            addTaskValue={detail.tasks.addTaskValue}
            showAddTask={detail.tasks.showAddTask}
            addTaskInputRef={detail.tasks.addTaskInputRef}
            onAddTaskValueChange={detail.tasks.setAddTaskValue}
            onShowAddTaskChange={detail.tasks.setShowAddTask}
            onSubmitAddTask={() => void detail.tasks.handleAddTaskSubmit()}
            onToggleTask={(taskId) => void detail.tasks.handleToggleTask(taskId)}
            onDeleteTask={(taskId) => void detail.tasks.handleDeleteTask(taskId)}
          />
        </motion.main>
      </div>

      <ProjectDialogs
        project={detail.project}
        dialogs={detail.dialogs}
        share={detail.share}
      />

      <ProjectDock projects={dockProjects} />
    </>
  );
}

function ProjectDetailLoadingState() {
  return (
    <div className="mx-auto max-w-[1200px] px-6 py-10 sm:px-10 lg:px-14">
      <div className="skeleton mb-3 h-4 w-28" />
      <div className="skeleton mb-2 h-8 w-60" />
      <div className="skeleton mb-12 h-4 w-40" />
      <div className="skeleton mb-14 h-48 w-full rounded-xl" />
      <div className="mx-auto max-w-[560px] space-y-3">
        {[1, 2, 3, 4].map((value) => (
          <div key={value} className="skeleton h-10 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

function ProjectNotFoundState() {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center">
      <h2 className="font-heading text-[22px] font-semibold text-text-primary">
        Project not found
      </h2>
      <Link to="/dashboard" className="mt-2 text-[14px] text-accent hover:underline">
        Back to dashboard
      </Link>
    </div>
  );
}
