import { Outlet, createFileRoute, useLocation } from "@tanstack/react-router";
import { AuthPage } from "@/components/auth/AuthPage";
import { authSearchSchema } from "@/lib/authValidation";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>) => {
    const parsed = authSearchSchema.safeParse(search);
    return parsed.success ? parsed.data : {};
  },
  component: AuthRoute,
});

function AuthRoute() {
  const location = useLocation();

  if (location.pathname !== "/auth") {
    return <Outlet />;
  }

  return <AuthPage />;
}
