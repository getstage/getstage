import { createFileRoute } from "@tanstack/react-router";
import { AuthPage } from "@/components/auth/AuthPage";

type AuthSearch = {
  desktop_redirect_uri?: string;
  desktop_state?: string;
  redirect?: string;
};

export const Route = createFileRoute("/auth")({
  component: AuthPage,
  validateSearch: (search: Record<string, unknown>): AuthSearch => ({
    desktop_redirect_uri:
      typeof search.desktop_redirect_uri === "string" ? search.desktop_redirect_uri : undefined,
    desktop_state:
      typeof search.desktop_state === "string" ? search.desktop_state : undefined,
    redirect:
      typeof search.redirect === "string" ? search.redirect : undefined,
  }),
});
