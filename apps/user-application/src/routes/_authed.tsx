import { createFileRoute, redirect } from "@tanstack/react-router";
import { AuthedWorkspaceLayout } from "@/app/AuthedWorkspaceLayout";
import { buildAuthRedirect } from "@/lib/authRedirect";
import { getDesktopSession } from "@/lib/desktopSession";

export const Route = createFileRoute("/_authed")({
  component: AuthedWorkspaceLayout,
  beforeLoad: async ({ location }) => {
    const session = await getDesktopSession();

    if (!session?.hasAccessToken) {
      const redirectTarget = buildAuthRedirect(
        location.pathname,
        location.searchStr,
        location.hash,
      );

      throw redirect(
        redirectTarget
          ? { to: "/auth", search: { redirect: redirectTarget } }
          : { to: "/auth" },
      );
    }
  },
});
