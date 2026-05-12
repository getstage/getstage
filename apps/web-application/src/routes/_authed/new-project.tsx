import { Navigate, createFileRoute } from "@tanstack/react-router";
import { ProjectCreationPage } from "@/components/creation/ProjectCreationPage";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authed/new-project")({
  component: NewProjectRoute,
});

function NewProjectRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-[360px] items-center justify-center">
        <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  if (user?.plan !== "pro") {
    return <Navigate to="/dashboard" replace />;
  }

  return <ProjectCreationPage />;
}
