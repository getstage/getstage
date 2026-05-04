import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { WorkspaceFrame } from "@/app/WorkspaceFrame";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { settingsSnapshot } from "../data/settingsSnapshot";
import type { Integration, SettingsTab } from "../models/settings";
import { SettingsIcon } from "./SettingsIcons";
import { MockToggle, SaveButton, SettingsCard, SettingsRow } from "./SettingsPrimitives";

const SETTINGS_TABS: Array<{ key: SettingsTab; label: string; icon: string }> = [
  { key: "profile", label: "Profile", icon: "profile" },
  { key: "billing", label: "Plans & Billing", icon: "billing" },
  { key: "clients", label: "Clients", icon: "clients" },
  { key: "developer", label: "Developer", icon: "developer" },
  { key: "account", label: "Account", icon: "account" },
];

export function SettingsPageView({
  initialTab = "profile",
}: {
  initialTab?: SettingsTab;
}) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
  const isIntegrationsPage = activeTab === "integrations";

  const title = isIntegrationsPage ? "Integrations" : "Settings";
  const subtitle = isIntegrationsPage
    ? "Manage all your integrations and tool connections here"
    : "Manage your account";

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  function selectTab(tab: SettingsTab) {
    setActiveTab(tab);
    if (tab === "integrations") {
      void navigate({ to: "/integrations" });
      return;
    }
    if (tab === "profile") {
      void navigate({ to: "/settings" });
      return;
    }
    if (tab === "billing") void navigate({ to: "/settings/billing" });
    if (tab === "clients") void navigate({ to: "/settings/clients" });
    if (tab === "developer") void navigate({ to: "/settings/developer" });
    if (tab === "account") void navigate({ to: "/settings/account" });
    if (tab === "portal") void navigate({ to: "/settings/portal" });
  }

  return (
    <WorkspaceFrame>
      <div className="flex-1 px-[92px] py-[88px]">
        <div className="mx-auto w-full max-w-[980px]">
          <button
            type="button"
            onClick={() => void navigate({ to: "/" })}
            className="mb-[42px] inline-flex items-center gap-[8px] text-[20px] font-medium text-[#A3A3A3] transition-colors hover:text-[#737373]"
          >
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-[20px] w-[20px]">
              <path d="M12.5 4.5L7 10l5.5 5.5" />
            </svg>
            Back to dashboard
          </button>

          <header className="mb-[38px]">
            <h1 className="font-heading text-[30px] font-semibold leading-[1.1] text-[#0A0A0A]">
              {title}
            </h1>
            <p className="mt-[12px] text-[20px] font-medium leading-[1.2] text-[#737373]">
              {subtitle}
            </p>
          </header>

          {!isIntegrationsPage ? (
            <SettingsTabBar activeTab={activeTab} onSelect={selectTab} />
          ) : null}

          <div className={isIntegrationsPage ? "mt-[38px]" : "mt-[72px]"}>
            {activeTab === "profile" ? <ProfilePanel /> : null}
            {activeTab === "billing" ? <BillingPanel /> : null}
            {activeTab === "clients" ? <ClientsPanel /> : null}
            {activeTab === "developer" ? <DeveloperPanel /> : null}
            {activeTab === "account" ? <AccountPanel /> : null}
            {activeTab === "integrations" ? <IntegrationsPanel /> : null}
            {activeTab === "portal" ? <ClientPortalPanel /> : null}
          </div>
        </div>
      </div>
    </WorkspaceFrame>
  );
}

function SettingsTabBar({
  activeTab,
  onSelect,
}: {
  activeTab: SettingsTab;
  onSelect: (tab: SettingsTab) => void;
}) {
  return (
    <div className="inline-flex max-w-full items-center gap-[2px] overflow-x-auto rounded-[8px] bg-[#F5F5F5] p-[2px]">
      {SETTINGS_TABS.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onSelect(tab.key)}
            className={`inline-flex items-center gap-[10px] whitespace-nowrap rounded-[6px] px-[16px] py-[9px] text-[18px] font-medium leading-none transition-all ${
              isActive
                ? "bg-gradient-to-b from-[#8D87FF] to-[#7B76DF] text-white shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]"
                : "text-[#737373] hover:bg-white"
            }`}
          >
            <SettingsIcon name={tab.icon} className="h-[19px] w-[19px]" />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

function ProfilePanel() {
  const { profile } = settingsSnapshot;

  return (
    <SettingsCard title="Profile Details">
      <div className="flex flex-col gap-[6px]">
        <SettingsRow>
          <div className="mb-[18px]">
            <h3 className="text-[20px] font-medium text-[#0A0A0A]">Full Name</h3>
            <p className="mt-[6px] text-[16px] font-medium text-[#525252]">
              This is your name as it will be displayed on the platform.
            </p>
          </div>
          <div className="flex gap-[10px]">
            <div className="flex min-h-[52px] flex-1 items-center rounded-[8px] bg-[#F5F5F5] px-[18px] text-[20px] font-medium text-[#1B1B2F] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
              {profile.fullName}
            </div>
            <SaveButton />
          </div>
        </SettingsRow>

        <SettingsRow>
          <div className="mb-[28px]">
            <h3 className="text-[20px] font-medium text-[#0A0A0A]">Avatar</h3>
            <p className="mt-[6px] text-[16px] font-medium text-[#525252]">
              This is what you will look like on the platform.
            </p>
          </div>
          <div className="flex items-center gap-[16px]">
            <Avatar name={profile.fullName} size="lg" />
            <button type="button" className="inline-flex items-center gap-[8px] text-[18px] font-medium text-[#1B1B2F]">
              <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
                <path d="M9 13V4" />
                <path d="M5.5 7.5L9 4l3.5 3.5" />
                <path d="M4 14.5h10" />
              </svg>
              Reupload
            </button>
            <span className="flex-1" />
            <button type="button" className="text-[16px] font-medium text-[#FF3939]">
              Remove
            </button>
            <SaveButton />
          </div>
          <p className="mt-[12px] text-[16px] font-medium text-[#8C8C8C]">
            Square image recommended
          </p>
        </SettingsRow>

        <SettingsRow>
          <div className="mb-[24px] flex items-start justify-between gap-[16px]">
            <div>
              <h3 className="text-[20px] font-medium text-[#0A0A0A]">Role</h3>
              <p className="mt-[6px] text-[16px] font-medium text-[#525252]">
                This helps Stage tailor the experience for you.
              </p>
            </div>
            <SaveButton />
          </div>
          <div className="grid grid-cols-4 gap-[8px]">
            {profile.roles.map((role) => {
              const active = role.id === profile.selectedRole;
              return (
                <button
                  key={role.id}
                  type="button"
                  className={`flex h-[92px] items-center justify-center gap-[12px] rounded-[6px] text-[18px] font-medium transition-colors ${
                    active
                      ? "bg-[#E8E6FF] text-[#14113F] shadow-[inset_0_0_0_1px_rgba(135,130,245,0.25)]"
                      : "bg-[#F5F5F5] text-[#525252] hover:bg-[#EFEFEF]"
                  }`}
                >
                  <SettingsIcon name={role.icon} className="h-[21px] w-[21px]" />
                  {role.label}
                </button>
              );
            })}
          </div>
        </SettingsRow>
      </div>
    </SettingsCard>
  );
}

function BillingPanel() {
  const { billing } = settingsSnapshot;

  return (
    <div className="flex max-w-[760px] flex-col gap-[18px]">
      <SettingsCard title="Current plan">
        <SettingsRow>
          <div className="flex items-end justify-between gap-[20px]">
            <div className="grid flex-1 grid-cols-3 gap-[28px]">
              <div>
                <p className="text-[13px] font-medium text-[#737373]">Your current plan</p>
                <p className="mt-[6px] text-[16px] font-medium text-[#0A0A0A]">{billing.planName}</p>
              </div>
              <div>
                <p className="text-[13px] font-medium text-[#737373]">Billing Cycle</p>
                <p className="mt-[6px] text-[16px] font-medium text-[#0A0A0A]">{billing.billingCycle}</p>
              </div>
              <div>
                <p className="text-[13px] font-medium text-[#737373]">Renews on</p>
                <p className="mt-[6px] text-[16px] font-medium text-[#0A0A0A]">{billing.renewsOn}</p>
              </div>
            </div>
            <button type="button" className="rounded-[6px] bg-gradient-to-b from-[#6B5AE7] to-[#4F43B5] px-[18px] py-[10px] text-[13px] font-medium text-white shadow-[0_0.45px_1px_rgba(10,10,10,0.35)]">
              Upgrade to Team Plan
            </button>
          </div>
        </SettingsRow>
      </SettingsCard>

      <SettingsCard title="Payment method">
        <SettingsRow>
          <div className="flex items-center justify-between gap-[20px]">
            <div className="flex items-center gap-[12px]">
              <span className="text-[14px] font-black italic text-[#1434CB]">VISA</span>
              <span className="text-[14px] font-medium text-[#0A0A0A]">{billing.paymentMethod}</span>
            </div>
            <SaveButton>Update Payment Method</SaveButton>
          </div>
        </SettingsRow>
      </SettingsCard>
    </div>
  );
}

function ClientsPanel() {
  const totalProjects = useMemo(
    () => settingsSnapshot.clients.reduce((sum, client) => sum + client.projectCount, 0),
    [],
  );

  return (
    <SettingsCard title="Your clients" className="max-w-[760px]">
      <div className="flex flex-col gap-[6px]">
        {settingsSnapshot.clients.map((client) => (
          <SettingsRow key={client.id}>
            <div className="flex items-center justify-between gap-[18px]">
              <div className="flex items-center gap-[12px]">
                <Avatar name={client.name} size="md" />
                <div>
                  <h3 className="text-[14px] font-semibold text-[#0A0A0A]">{client.name}</h3>
                  <p className="mt-[2px] text-[13px] text-[#525252]">{client.email}</p>
                </div>
              </div>
              <Badge variant="accent">{client.projectCount} Project</Badge>
            </div>
            <p className="mt-[14px] text-[13px] text-[#737373]">
              Already linked to active workspace history.
            </p>
          </SettingsRow>
        ))}
        <div className="px-[12px] py-[10px] text-[13px] font-medium text-[#525252]">
          {totalProjects} Projects <span className="px-[8px] text-[#A3A3A3]">•</span> {settingsSnapshot.clients.length} Clients
        </div>
      </div>
    </SettingsCard>
  );
}

function DeveloperPanel() {
  const { developer } = settingsSnapshot;

  return (
    <SettingsCard title="Your API Key" className="max-w-[760px]">
      <div className="flex flex-col gap-[6px]">
        <SettingsRow>
          <label className="mb-[8px] block text-[13px] font-medium text-[#0A0A0A]">API Key</label>
          <div className="flex min-h-[38px] items-center justify-between rounded-[6px] bg-[#F5F5F5] px-[12px] text-[13px] text-[#262626]">
            {developer.apiKey}
            <SettingsIcon name="document" className="h-[16px] w-[16px] text-[#737373]" />
          </div>
        </SettingsRow>
        <SettingsRow>
          <label className="mb-[8px] block text-[13px] font-medium text-[#0A0A0A]">Generated Prompt</label>
          <pre className="min-h-[260px] whitespace-pre-wrap rounded-[6px] bg-[#F5F5F5] p-[16px] font-mono text-[12px] leading-[1.55] text-[#525252]">
            {developer.generatedPrompt}
          </pre>
        </SettingsRow>
      </div>
    </SettingsCard>
  );
}

function AccountPanel() {
  return (
    <SettingsCard className="max-w-[760px]">
      <SettingsRow>
        <h2 className="text-[16px] font-semibold text-[#0A0A0A]">Delete account</h2>
        <p className="mt-[8px] max-w-[620px] text-[13px] leading-[1.45] text-[#262626]">
          Permanently delete your account and all associated projects, research, strategies,
          and generated assets. This action is immediate and cannot be undone.
        </p>
        <button type="button" className="mt-[18px] rounded-[6px] bg-[#D83A34] px-[14px] py-[9px] text-[13px] font-medium text-white">
          Delete Account
        </button>
      </SettingsRow>
    </SettingsCard>
  );
}

function IntegrationsPanel() {
  const { integrations } = settingsSnapshot;

  return (
    <div className="flex max-w-[780px] flex-col gap-[18px]">
      <SettingsCard title="Connected">
        {integrations.connected.map((integration) => (
          <IntegrationRow key={integration.id} integration={integration} />
        ))}
      </SettingsCard>

      <SettingsCard title="Available Tools">
        <div className="rounded-[6px] bg-white p-[16px] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
          {integrations.available.map((integration) => (
            <IntegrationRow key={integration.id} integration={integration} compact />
          ))}
        </div>
      </SettingsCard>
    </div>
  );
}

function IntegrationRow({
  integration,
  compact,
}: {
  integration: Integration;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      className={`flex w-full items-center justify-between gap-[18px] rounded-[6px] bg-white text-left transition-colors hover:bg-[#FAFAFA] ${
        compact ? "px-[16px] py-[11px]" : "p-[16px] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]"
      }`}
    >
      <span className="flex items-center gap-[12px]">
        <SettingsIcon
          name={integration.icon}
          className="h-[24px] w-[24px]"
        />
        <span>
          <span className="block text-[18px] font-medium text-[#0A0A0A]">
            {integration.name}
          </span>
          <span className="mt-[2px] block text-[16px] font-medium text-[#525252]">
            {integration.description}
          </span>
        </span>
      </span>
      <MockToggle active={integration.connected} />
    </button>
  );
}

function ClientPortalPanel() {
  return (
    <SettingsCard title="Client Portal" className="max-w-[760px]">
      <SettingsRow>
        <h2 className="text-[18px] font-medium text-[#0A0A0A]">Portal preview</h2>
        <p className="mt-[6px] text-[14px] text-[#737373]">
          Mock-only placeholder for the desktop design pass. Real portal wiring stays on the web/backend track.
        </p>
      </SettingsRow>
    </SettingsCard>
  );
}
