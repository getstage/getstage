import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppLayout } from "@/components/shared/AppLayout";
import { AUTH_BYPASS_ENABLED, getCurrentUser } from "@/lib/auth";

export const Route = createFileRoute("/_app")({
  beforeLoad: async () => {
    if (AUTH_BYPASS_ENABLED) {
      return { user: await getCurrentUser() };
    }

    // { Replace: Clerk/Auth0 auth check }
    const user = await getCurrentUser();
    if (!user) {
      throw redirect({ to: "/auth" });
    }
    return { user };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}
