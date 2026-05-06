import { createFileRoute } from "@tanstack/react-router";
import { TaskDetailPage } from "@/components/task/TaskDetailPage";

export const Route = createFileRoute("/_authed/project/$id/task/$taskId")({
  component: TaskDetailPage,
});
