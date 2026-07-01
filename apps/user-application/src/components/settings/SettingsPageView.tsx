import { Suspense, lazy } from "react";
import type { SettingsTab } from "@/models/settings/settings";
import { SettingsShell } from "./SettingsShell";
import { ShortcutsPanel } from "./ShortcutsPanel";

const AccountPanel = lazy(() =>
  import("./AccountPanel").then((module) => ({ default: module.AccountPanel })),
);
const BillingPanel = lazy(() =>
  import("./BillingPanel").then((module) => ({ default: module.BillingPanel })),
);
const ClientsPanel = lazy(() =>
  import("./ClientsPanel").then((module) => ({ default: module.ClientsPanel })),
);
const ClientPortalSettingsView = lazy(() =>
  import("@/components/client-portal/ClientPortalSettingsView").then((module) => ({
    default: module.ClientPortalSettingsView,
  })),
);
const DeveloperPanel = lazy(() =>
  import("./DeveloperPanel").then((module) => ({ default: module.DeveloperPanel })),
);
const IntegrationsPage = lazy(() =>
  import("./IntegrationsPage").then((module) => ({ default: module.IntegrationsPage })),
);
const ProfilePanel = lazy(() =>
  import("./ProfilePanel").then((module) => ({ default: module.ProfilePanel })),
);
const TeamPanel = lazy(() =>
  import("./TeamPanel").then((module) => ({ default: module.TeamPanel })),
);

export function SettingsPageView({
  initialTab = "profile",
}: {
  initialTab?: SettingsTab;
}) {
  if (initialTab === "integrations") {
    return (
      <Suspense fallback={<SettingsLoadingState />}>
        <IntegrationsPage />
      </Suspense>
    );
  }

  if (initialTab === "portal") {
    return (
      <Suspense fallback={<SettingsLoadingState />}>
        <ClientPortalSettingsView />
      </Suspense>
    );
  }

  return (
    <SettingsShell activeTab={initialTab}>
      <Suspense fallback={<SettingsLoadingState />}>
        {initialTab === "profile" ? <ProfilePanel /> : null}
        {initialTab === "billing" ? <BillingPanel /> : null}
        {initialTab === "team" ? <TeamPanel /> : null}
        {initialTab === "clients" ? <ClientsPanel /> : null}
        {initialTab === "developer" ? <DeveloperPanel /> : null}
        {initialTab === "shortcuts" ? <ShortcutsPanel /> : null}
        {initialTab === "account" ? <AccountPanel /> : null}
      </Suspense>
    </SettingsShell>
  );
}

function SettingsLoadingState() {
  return (
    <div className="rounded-[12px] bg-[#F5F5F5] p-1">
      <div className="rounded-[8px] bg-white p-4">
        <div className="skeleton h-4 w-36" />
        <div className="skeleton mt-3 h-3 w-64 max-w-full" />
        <div className="skeleton mt-6 h-[260px] w-full rounded-[8px]" />
      </div>
    </div>
  );
}
