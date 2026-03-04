import { DashboardCard } from "@/components/dashboard/DashboardCard";
import type { DashboardTaskEntry } from "@/components/dashboard/dashboardTypes";

type UpcomingTasksCardProps = {
  tasks: DashboardTaskEntry[];
};

export function UpcomingTasksCard({ tasks }: UpcomingTasksCardProps) {
  return (
    <DashboardCard className="h-full" title="Upcoming">
      {tasks.length > 0 ? (
        <div className="space-y-0">
          {tasks.map((entry, index) => (
            <div
              key={entry.task.id}
              className={`flex items-center gap-2.5 py-1.5 text-[13px] ${
                index > 0 ? "border-t border-border-subtle" : ""
              }`}
            >
              <div className="h-5 w-5 overflow-hidden rounded-full bg-input-bg">
                {entry.project.clientAvatarUrl ? (
                  <img
                    src={entry.project.clientAvatarUrl}
                    alt={entry.project.clientName}
                    className="h-full w-full object-cover"
                  />
                ) : null}
              </div>
              <span className="truncate text-text-primary">{entry.task.title}</span>
              <span className="ml-auto rounded-full bg-border-subtle px-2 py-0.5 text-[11px] text-text-secondary">
                {entry.phase.name}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[13px] text-text-secondary">No upcoming tasks.</p>
      )}
    </DashboardCard>
  );
}
