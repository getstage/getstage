import { createFileRoute } from "@tanstack/react-router";
import { ClientPortalPreviewView } from "@/client-portal/components/ClientPortalPreviewView";

export const Route = createFileRoute("/_authed/client-portal/$projectId/preview")({
  component: ClientPortalPreviewView,
});
