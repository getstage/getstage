import { DashboardCard, CardTab } from "@/components/dashboard/DashboardCard";
import { Avatar } from "@/components/ui/Avatar";
import type { DashboardTaskEntry } from "@/components/dashboard/dashboardTypes";

type UpcomingTasksCardProps = {
  tasks: DashboardTaskEntry[];
};

function getDueLabel(dueDate: number | undefined): { text: string; color: string } | null {
  if (!dueDate) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const diffDays = Math.round((due.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

  if (diffDays < 0) return { text: "Overdue", color: "text-[#ef4444]" };
  if (diffDays === 0) return { text: "Due today", color: "text-[#ef4444]" };
  if (diffDays === 1) return { text: "Due tomorrow", color: "text-[#f97316]" };
  if (diffDays <= 7) return { text: `Due in ${diffDays} days`, color: "text-[#16a34a]" };
  return { text: `Due in ${diffDays} days`, color: "text-text-secondary" };
}

export function UpcomingTasksCard({ tasks }: UpcomingTasksCardProps) {
  const totalDue = tasks.length;

  return (
    <DashboardCard
      className="h-full"
      title="Upcoming Deadlines"
      subtitle="Tasks requiring your attention soon"
      action={<CardTab label="This Month" />}
    >
      {tasks.length > 0 ? (
        <>
          <div className="flex flex-col gap-4">
            {tasks.map((entry, index) => {
              const dueLabel = getDueLabel(entry.task.dueDate);

              return (
                <div key={entry.task.id}>
                  {index > 0 && <div className="mb-4 h-px bg-border-subtle" />}
                  <div className="flex items-start gap-2.5">
                    <Avatar
                      name={entry.project.clientName}
                      src={entry.project.projectImageUrl ?? entry.project.clientAvatarUrl}
                      size="sm"
                      variant="project"
                      className="h-7 w-7 shrink-0 text-[10px]"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-medium leading-[1.2] text-text-primary">
                        {entry.task.title}
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-[12px] font-medium leading-[1.5] text-text-secondary">
                        <span>{entry.project.name}</span>
                        {dueLabel && (
                          <>
                            <span className="h-1 w-1 shrink-0 rounded-full bg-text-tertiary" />
                            <span className={dueLabel.color}>{dueLabel.text}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {totalDue > 0 && (
            <div className="mt-6 text-[12px] text-text-secondary">
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
