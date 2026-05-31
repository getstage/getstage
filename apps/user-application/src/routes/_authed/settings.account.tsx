import { createFileRoute } from "@tanstack/react-router";
import { SettingsPageView } from "@/components/settings/SettingsPageView";

export const Route = createFileRoute("/_authed/settings/account")({
  component: () => <SettingsPageView initialTab="account" />,
});
