import { createFileRoute } from "@tanstack/react-router";
import { ClientPortalPage } from "@/components/portal/ClientPortalPage";

export const Route = createFileRoute("/portal/$token")({
  component: ClientPortalPage,
});
