import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Helmet } from "react-helmet-async";
import { BillingPanel } from "@stage/project-ui/settings/BillingPanel";
import { ClientsPanel } from "@stage/project-ui/settings/ClientsPanel";
import { AccountPanel } from "@stage/project-ui/settings/AccountPanel";
import type { SettingsTab } from "@stage/project-ui/settings/model";
import { ProfilePanel } from "@stage/project-ui/settings/ProfilePanel";
import { SettingsShell } from "@stage/project-ui/settings/SettingsShell";
import { SETTINGS_TABS } from "@stage/project-ui/settings/tabs";
import { TeamPanel } from "@stage/project-ui/settings/TeamPanel";
import { useSignOut } from "@/lib/auth";

// Stage for Mac's Settings on the web. Shortcuts are desktop keyboard shortcuts, so that tab is hidden.
const WEB_TABS = SETTINGS_TABS.map((tab) => tab.key).filter((tab) => tab !== "shortcuts");

export const Route = createFileRoute("/app/_authed/settings")({
  validateSearch: (search: Record<string, unknown>): { tab?: SettingsTab } => ({
    tab: WEB_TABS.find((tab) => tab === search.tab),
  }),
  component: SettingsRoute,
});

function SettingsRoute() {
  const { tab = "profile" } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const signOut = useSignOut();
  return (
    <>
      <Helmet><title>Settings — Stage</title></Helmet>
      <SettingsShell activeTab={tab} hiddenTabs={["shortcuts"]} onSelectTab={(next) => void navigate({ search: { tab: next } })}>
        {tab === "profile" ? <ProfilePanel /> : null}
        {tab === "team" ? <TeamPanel /> : null}
        {tab === "billing" ? <BillingPanel /> : null}
        {tab === "clients" ? <ClientsPanel /> : null}
        {tab === "account" ? (
          <AccountPanel onAccountDeleted={async () => {
            await signOut();
            window.location.assign("/");
          }} />
        ) : null}
      </SettingsShell>
    </>
  );
}
