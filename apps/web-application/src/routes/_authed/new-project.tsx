import { PageLoading } from "@/components/shared/PageLoading";
import { Navigate, createFileRoute } from "@tanstack/react-router";
import { ProjectCreationPage } from "@/components/creation/ProjectCreationPage";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authed/new-project")({
  component: NewProjectRoute,
});

function NewProjectRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <PageLoading />;
  }

  const canCreateProjects =
    user?.plan === "start" || user?.plan === "pro" || user?.plan === "team";
  if (!canCreateProjects) {
    return <Navigate to="/dashboard" replace />;
  }

  return <ProjectCreationPage />;
}
