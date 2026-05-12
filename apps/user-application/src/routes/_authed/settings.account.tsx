import { createFileRoute } from "@tanstack/react-router";
import { SettingsPageView } from "@/settings/components/SettingsPageView";

export const Route = createFileRoute("/_authed/settings/account")({
  component: () => <SettingsPageView initialTab="account" />,
});
