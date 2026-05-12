import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { DesktopAuthView } from "@/auth/DesktopAuthView";
import { getSafeAuthRedirect } from "@/lib/authRedirect";
import { getDesktopSession } from "@/lib/desktopSession";

const authSearchSchema = z.object({
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: (search: unknown) => {
    const parsedSearch = authSearchSchema.safeParse(search);
    return parsedSearch.success ? parsedSearch.data : { redirect: undefined };
  },
  component: DesktopAuthView,
  beforeLoad: async ({ search }) => {
    const session = await getDesktopSession();

    if (session?.hasAccessToken) {
      const redirectTarget = getSafeAuthRedirect(search.redirect);
      throw redirect(redirectTarget ? { href: redirectTarget } : { to: "/" });
    }
  },
});
