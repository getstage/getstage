import { createFileRoute } from "@tanstack/react-router";
import { AuthPage } from "@/components/auth/AuthPage";

type AuthSearch = {
  redirect?: string;
};

export const Route = createFileRoute("/auth")({
  component: AuthPage,
  validateSearch: (search: Record<string, unknown>): AuthSearch => ({
    redirect:
      typeof search.redirect === "string" ? search.redirect : undefined,
  }),
});
