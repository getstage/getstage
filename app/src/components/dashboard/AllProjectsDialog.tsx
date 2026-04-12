import * as Dialog from "@radix-ui/react-dialog";
import { Link } from "@tanstack/react-router";
import { X } from "@phosphor-icons/react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { PROJECT_TYPE_LABELS, type Project } from "@/types";

type AllProjectsDialogProps = {
  open: boolean;
  projects: Project[];
  onOpenChange: (open: boolean) => void;
};

const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

export function AllProjectsDialog({
  open,
  projects,
  onOpenChange,
}: AllProjectsDialogProps) {
  const sortedProjects = [...projects].sort((a, b) => {
    const statusWeight = getStatusWeight(a.status) - getStatusWeight(b.status);
    if (statusWeight !== 0) {
      return statusWeight;
    }

    return a.endDate - b.endDate || a.startDate - b.startDate || a.createdAt - b.createdAt;
  });

  const activeCount = projects.filter((project) => project.status === "active").length;
  const pausedCount = projects.filter((project) => project.status === "paused").length;
  const completedCount = projects.filter((project) => project.status === "completed").length;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[rgba(25,24,42,0.54)] backdrop-blur-[3px]" />
        <Dialog.Content className="fixed inset-x-0 bottom-0 z-50 flex max-h-[92svh] flex-col overflow-hidden rounded-t-[22px] bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_28px_90px_rgba(10,12,22,0.26)] outline-none sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-h-[calc(100svh-40px)] sm:w-[calc(100%-32px)] sm:max-w-[860px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[22px] sm:pb-0">
          <div className="flex items-start justify-between gap-4 border-b border-border-subtle px-5 py-5 sm:px-7">
            <div>
              <Dialog.Title className="font-heading text-[20px] font-medium tracking-[-0.2px] text-text-primary">
                All projects
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-[13px] text-text-secondary">
                Track every project in one place and jump straight into the right workspace.
              </Dialog.Description>
            </div>

            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close projects overview"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border-subtle text-text-secondary transition-colors hover:border-border hover:text-text-primary"
              >
                <X size={16} />
              </button>
            </Dialog.Close>
          </div>

          <div className="border-b border-border-subtle px-5 py-4 sm:px-7">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <SummaryStat label="Total" value={projects.length} accentClass="text-text-primary" />
              <SummaryStat label="Active" value={activeCount} accentClass="text-accent" />
              <SummaryStat label="Paused" value={pausedCount} accentClass="text-warning" />
              <SummaryStat label="Completed" value={completedCount} accentClass="text-success" />
            </div>
          </div>

          <div className="max-h-[min(62vh,640px)] overflow-y-auto px-5 py-2 sm:px-7">
            {sortedProjects.length > 0 ? (
              <div className="divide-y divide-border-subtle">
                {sortedProjects.map((project) => {
                  const currentPhase = getCurrentPhaseName(project);
                  const statusBadge = getStatusBadge(project.status);

                  return (
                    <Link
                      key={project.id}
                      to="/project/$id"
                      params={{ id: project.id }}
                      onClick={() => onOpenChange(false)}
                      className="flex flex-col gap-4 py-4 transition-opacity hover:opacity-90 sm:flex-row sm:items-center"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-3">
                          <Avatar
                            name={project.name}
                            src={project.projectImageUrl ?? project.clientAvatarUrl}
                            size="md"
                            variant="project"
                            className="mt-0.5"
                          />

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="truncate text-[14px] font-medium text-text-primary">
                                {project.name}
                              </span>
                              <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
                            </div>

                            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-text-secondary">
                              <span>{project.clientName}</span>
                              <span>{PROJECT_TYPE_LABELS[project.type]}</span>
                              <span>{formatDateRange(project.startDate, project.endDate)}</span>
                            </div>

                            <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px] text-text-tertiary">
                              <span>Current phase: {currentPhase}</span>
                              <span>{countRemainingTasks(project)} open tasks</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="w-full shrink-0 sm:w-[220px]">
                        <ProgressBar value={project.progress} showLabel />
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="py-10 text-center">
                <p className="text-[14px] font-medium text-text-primary">No projects yet.</p>
                <p className="mt-1 text-[13px] text-text-secondary">
                  Create your first project to populate the pipeline overview.
                </p>
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function SummaryStat({
  label,
  value,
  accentClass,
}: {
  label: string;
  value: number;
  accentClass: string;
}) {
  return (
    <div className="rounded-[16px] border border-border-subtle bg-[#FAFAFD] px-4 py-3">
      <div className={`text-[20px] font-semibold tracking-[-0.2px] ${accentClass}`}>{value}</div>
      <div className="text-[12px] text-text-secondary">{label}</div>
    </div>
  );
}

function getStatusWeight(status: Project["status"]) {
  switch (status) {
    case "active":
      return 0;
    case "paused":
      return 1;
    case "completed":
      return 2;
    default:
      return 3;
  }
}

function getStatusBadge(status: Project["status"]) {
  switch (status) {
    case "active":
      return { label: "Active", variant: "accent" as const };
    case "paused":
      return { label: "Paused", variant: "warning" as const };
    case "completed":
      return { label: "Completed", variant: "success" as const };
    default:
      return { label: status, variant: "default" as const };
  }
}

function getCurrentPhaseName(project: Project) {
  const activePhase = project.phases.find((phase) => phase.status === "active");
  if (activePhase) {
    return activePhase.name;
  }

  const upcomingPhase = project.phases.find((phase) => phase.status === "upcoming");
  if (upcomingPhase) {
    return upcomingPhase.name;
  }

  return project.phases[project.phases.length - 1]?.name ?? "No phase";
}

function countRemainingTasks(project: Project) {
  return project.phases.reduce(
    (total, phase) => total + phase.tasks.filter((task) => !task.isCompleted).length,
    0,
  );
}

function formatDateRange(startDate: number, endDate: number) {
  return `${DATE_FORMATTER.format(startDate)} - ${DATE_FORMATTER.format(endDate)}`;
}
