import { ClientPortalSettingsView } from "@/client-portal/components/ClientPortalSettingsView";
import type { SettingsTab } from "../models/settings";
import { AccountPanel } from "./AccountPanel";
import { BillingPanel } from "./BillingPanel";
import { ClientsPanel } from "./ClientsPanel";
import { DeveloperPanel } from "./DeveloperPanel";
import { IntegrationsPage } from "./IntegrationsPage";
import { ProfilePanel } from "./ProfilePanel";
import { SettingsShell } from "./SettingsShell";

export function SettingsPageView({
  initialTab = "profile",
}: {
  initialTab?: SettingsTab;
}) {
  if (initialTab === "integrations") {
    return <IntegrationsPage />;
  }

  if (initialTab === "portal") {
    return <ClientPortalSettingsView />;
  }

  return (
    <SettingsShell activeTab={initialTab}>
      {initialTab === "profile" ? <ProfilePanel /> : null}
      {initialTab === "billing" ? <BillingPanel /> : null}
      {initialTab === "clients" ? <ClientsPanel /> : null}
      {initialTab === "developer" ? <DeveloperPanel /> : null}
      {initialTab === "account" ? <AccountPanel /> : null}
    </SettingsShell>
  );
}
