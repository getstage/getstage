import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { DesktopAuthView } from "@/auth/DesktopAuthView";
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
  beforeLoad: async () => {
    const session = await getDesktopSession();

    if (session?.hasAccessToken) {
      throw redirect({ to: "/" });
    }
  },
});
