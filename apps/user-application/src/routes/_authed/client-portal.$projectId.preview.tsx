import { createFileRoute } from "@tanstack/react-router";
import { ClientPortalPreviewView } from "@/components/client-portal/ClientPortalPreviewView";

export const Route = createFileRoute("/_authed/client-portal/$projectId/preview")({
  component: ClientPortalPreviewView,
});
