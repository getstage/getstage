import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { TaskDetailsView } from "@/tasks/components/TaskDetailsView";

const taskDetailsSearchSchema = z.object({
  from: z.union([z.literal("project"), z.literal("client-portal")]).optional(),
  projectId: z.string().optional(),
});

export const Route = createFileRoute("/_authed/tasks/$taskId")({
  validateSearch: (search: unknown) => {
    const parsedSearch = taskDetailsSearchSchema.safeParse(search);

    if (!parsedSearch.success) {
      return { from: "tasks", projectId: undefined };
    }

    return {
      from: parsedSearch.data.from ?? "tasks",
      projectId: parsedSearch.data.projectId,
    };
  },
  component: TaskDetailsView,
});
