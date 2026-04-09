import { DashboardCard, CardTab } from "@/components/dashboard/DashboardCard";
import { Avatar } from "@/components/ui/Avatar";
import type { DashboardTaskEntry } from "@/components/dashboard/dashboardTypes";

type UpcomingTasksCardProps = {
  tasks: DashboardTaskEntry[];
};

function formatDueDate(dueDate: number | undefined): string {
  if (!dueDate) return "";
  const date = new Date(dueDate);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[date.getMonth()]} ${date.getDate()}`;
}

function isUrgent(dueDate: number | undefined): boolean {
  if (!dueDate) return false;
  const now = Date.now();
  const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
  return dueDate - now < threeDaysMs;
}

export function UpcomingTasksCard({ tasks }: UpcomingTasksCardProps) {
  const totalDue = tasks.length;

  return (
    <DashboardCard
      className="h-full"
      title="Due Soon"
      action={<CardTab label="This week" />}
    >
      {tasks.length > 0 ? (
        <>
          <div>
            {tasks.map((entry, index) => {
              const urgent = isUrgent(entry.task.dueDate);
              const dateStr = formatDueDate(entry.task.dueDate);

              return (
                <div
                  key={entry.task.id}
                  className={`flex items-center gap-2.5 py-2.5 ${
                    index > 0 ? "border-t border-border-subtle" : ""
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                      urgent ? "bg-warning" : "bg-border"
                    }`}
                  />
                  <Avatar
                    name={entry.project.clientName}
                    src={entry.project.projectImageUrl ?? entry.project.clientAvatarUrl}
                    size="sm"
                    variant="project"
                    className="h-[22px] w-[22px] shrink-0 text-[9px]"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] text-text-primary">
                      {entry.task.title}
                    </div>
                    <div className="text-[11px] text-text-tertiary">
                      {entry.project.name}
                    </div>
                  </div>
                  {dateStr && (
                    <span
                      className={`shrink-0 text-[12px] ${
                        urgent ? "text-warning" : "text-text-tertiary"
                      }`}
                    >
                      {dateStr}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          {totalDue > 0 && (
            <div className="mt-2.5 border-t border-border-subtle pt-2.5 text-[12px] text-text-tertiary">
              {totalDue} task{totalDue !== 1 ? "s" : ""} due soon
            </div>
          )}
        </>
      ) : (
        <p className="text-[13px] text-text-secondary">No upcoming tasks.</p>
      )}
    </DashboardCard>
  );
}
