import { createFileRoute } from "@tanstack/react-router";
import { SettingsPageView } from "@/settings/components/SettingsPageView";

export const Route = createFileRoute("/_authed/settings/billing")({
  component: () => <SettingsPageView initialTab="billing" />,
});
