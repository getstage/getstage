import { createFileRoute } from "@tanstack/react-router";
import { TaskDetailPage } from "@/components/task/TaskDetailPage";

export const Route = createFileRoute("/_app/project/$id/task/$taskId")({
  component: TaskDetailPage,
});
