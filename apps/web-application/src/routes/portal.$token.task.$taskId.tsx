import { createFileRoute } from "@tanstack/react-router";
import { ClientPortalTaskPage } from "@/components/portal/ClientPortalTaskPage";

export const Route = createFileRoute("/portal/$token/task/$taskId")({
  component: ClientPortalTaskPage,
});
