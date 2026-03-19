import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import type { Project } from "@/types";
import { Avatar } from "@/components/ui/Avatar";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Badge } from "@/components/ui/Badge";
import { PROJECT_TYPE_LABELS } from "@/types";

interface ProjectBentoGridProps {
  projects: Project[];
}

export function ProjectBentoGrid({ projects }: ProjectBentoGridProps) {
  return (
    <div>
      <h2 className="mb-4 font-heading text-[16px] font-semibold text-text-primary">
        Your Projects
      </h2>
      <div className="grid grid-cols-4 gap-3">
        {projects.map((project, i) => (
          <motion.div
            key={project.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
          >
            <Link
              to="/project/$id"
              params={{ id: project.id }}
              className="group block rounded-xl border border-border-subtle bg-white p-4 transition-all duration-150 hover:border-border hover:shadow-[0_2px_8px_rgba(26,26,46,0.04)]"
            >
              <div className="mb-3 flex items-center gap-2.5">
                <Avatar
                  name={project.name}
                  src={project.projectImageUrl ?? project.clientAvatarUrl}
                  size="sm"
                  variant="project"
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] font-medium text-text-primary">
                    {project.name}
                  </div>
                  <div className="truncate text-[12px] text-text-secondary">
                    {project.clientName}
                  </div>
                </div>
              </div>

              <ProgressBar value={project.progress} showLabel className="mb-3" />

              <div className="flex items-center justify-between">
                <Badge
                  variant={
                    project.status === "completed"
                      ? "success"
                      : project.status === "paused"
                        ? "warning"
                        : "default"
                  }
                >
                  {project.status === "active"
                    ? getCurrentPhaseName(project)
                    : project.status}
                </Badge>
                <span className="text-[11px] text-text-tertiary">
                  {PROJECT_TYPE_LABELS[project.type]}
                </span>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function getCurrentPhaseName(project: Project): string {
  const active = project.phases.find((p) => p.status === "active");
  return active?.name ?? project.phases[project.phases.length - 1]?.name ?? "";
}
