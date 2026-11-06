import type { ComponentProps } from "react";
import { useQuery as useConvexQuery } from "convex/react";
import { parseConvexTaskId } from "@stage/data-ops";
import { KanbanTaskCard } from "@stage/project-ui/kanban";
import { KANBAN_ASSIGNEES } from "@/data/fixtures/project/kanbanAssignees";
import { useSettingsOverviewQuery } from "@/hooks/convex-data";
import { api } from "@/lib/convexApi";

// The shared task card plus what the Mac board loads for it: the full description and the assignee's photo.
export function TaskCard(props: Omit<ComponentProps<typeof KanbanTaskCard>, "description" | "assigneeAvatarUrl">) {
  const profile = useSettingsOverviewQuery().data?.profile;
  const assignee = props.task.assignees?.[0];
  const convexTaskId = props.task.hasContent ? parseConvexTaskId(props.task.id) : null;
  const taskDetail = useConvexQuery(api.tasks.getDetail, convexTaskId ? { taskId: convexTaskId } : "skip");
  return (
    <KanbanTaskCard
      {...props}
      description={taskDetail?.task.content?.trim()}
      assigneeAvatarUrl={assignee ? getTaskAssigneeAvatarUrl(assignee.name, profile) : undefined}
    />
  );
}

function getTaskAssigneeAvatarUrl(
  assigneeName: string,
  profile: { name: string; email: string; avatarUrl: string | null } | undefined,
) {
  if (profile?.avatarUrl && (assigneeName === profile.name || assigneeName === profile.email)) {
    return profile.avatarUrl;
  }

  return KANBAN_ASSIGNEES.find((assignee) => assignee.name.includes(assigneeName))?.avatar;
}

