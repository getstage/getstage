import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { WorkspaceFrame } from "@/app/WorkspaceFrame";
import { ClientPortalSettingsView } from "@/client-portal/components/ClientPortalSettingsView";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { settingsSnapshot } from "../data/settingsSnapshot";
import type { Integration, SettingsTab } from "../models/settings";
import { SettingsIcon } from "./SettingsIcons";
import { SaveButton, SettingsCard, SettingsRow, CopyButton } from "./SettingsPrimitives";

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

  if (isIntegrationsPage) {
    return (
      <WorkspaceFrame>
        <IntegrationsPage />
      </WorkspaceFrame>
    );
  }

  if (activeTab === "portal") {
    return (
      <WorkspaceFrame>
        <ClientPortalSettingsView />
      </WorkspaceFrame>
    );
  }

  return (
    <WorkspaceFrame>
      <div className="flex-1 px-[32px] py-[44px]">
        <div className="mx-auto flex w-full max-w-[674px] flex-col gap-[44px]">
          <div>
            <button
              type="button"
              onClick={() => void navigate({ to: "/" })}
              className="mb-[24px] inline-flex cursor-pointer items-center gap-[8px] text-[13px] font-medium leading-[1.5] text-[#A3A3A3] transition-colors hover:text-[#737373]"
            >
              <ArrowLeftIcon />
              Back to dashboard
            </button>

          <header className="mb-[24px]">
            <h1 className="text-[20px] font-semibold leading-[1.2] text-[#0A0A0A]">
              {title}
            </h1>
            <p className="mt-[8px] text-[13px] font-medium leading-[1.2] text-[#737373]">
              {subtitle}
            </p>
          </header>

          {!isIntegrationsPage ? (
            <SettingsTabBar activeTab={activeTab} onSelect={selectTab} />
          ) : null}
          </div>

          <div>
            {activeTab === "profile" ? <ProfilePanel /> : null}
            {activeTab === "billing" ? <BillingPanel /> : null}
            {activeTab === "clients" ? <ClientsPanel /> : null}
            {activeTab === "developer" ? <DeveloperPanel /> : null}
            {activeTab === "account" ? <AccountPanel /> : null}
          </div>
        </div>
      </div>
    </WorkspaceFrame>
  );
}

function ArrowLeftIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className="h-[16px] w-[16px] shrink-0"
    >
      <path
        d="M10 4 6 8l4 4M6.5 8H13"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
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
    <div className="inline-flex max-w-full items-center gap-[8px] overflow-x-auto rounded-[8px] bg-[#F5F5F5] p-[2px]">
      {SETTINGS_TABS.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onSelect(tab.key)}
            className={`inline-flex items-center gap-[8px] whitespace-nowrap rounded-[6px] py-[6px] pl-[10px] pr-[12px] text-[13px] font-medium leading-none transition-all ${
              isActive
                ? "bg-gradient-to-b from-[#8D87FF] to-[#7B76DF] text-white shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]"
                : "text-[#737373] hover:bg-white"
            }`}
          >
            <SettingsIcon name={tab.icon} className="h-[15px] w-[15px]" />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

function ProfilePanel() {
  const { profile } = settingsSnapshot;
  const [fullName, setFullName] = useState(profile.fullName);
  const [selectedRole, setSelectedRole] = useState(profile.selectedRole);

  return (
    <SettingsCard title="Profile Details">
      <div className="flex flex-col gap-[4px]">
        <SettingsRow>
          <div className="mb-[12px]">
            <h3 className="text-[13px] font-medium leading-none text-[#171717]">Full Name</h3>
            <p className="mt-[4px] text-[12px] font-normal leading-none text-[#525252]">
              This is your name as it will be displayed on the platform.
            </p>
          </div>
          <div className="flex gap-[8px]">
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="flex min-h-[30px] flex-1 items-center rounded-[6px] bg-[#F5F5F5] px-[12px] py-[8px] text-[12px] font-medium leading-none text-[#0A0A0A] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] outline-none"
            />
            <SaveButton />
          </div>
        </SettingsRow>

        <SettingsRow>
          <div className="mb-[16px]">
            <h3 className="text-[13px] font-medium leading-none text-[#171717]">Avatar</h3>
            <p className="mt-[4px] text-[12px] font-normal leading-none text-[#525252]">
              This is what you will look like on the platform.
            </p>
          </div>
          <div className="flex items-center gap-[8px]">
            <Avatar name={fullName} size="lg" className="h-[56px] w-[56px]" />
            <button
              type="button"
              className="inline-flex cursor-pointer items-center gap-[6px] pl-[12px] text-[12px] font-medium leading-none text-[#525252] transition-colors hover:text-[#171717]"
            >
              <SettingsIcon name="upload" className="h-[16px] w-[16px]" />
              Reupload
            </button>
            <span className="flex-1" />
            <button
              type="button"
              className="cursor-pointer text-[12px] font-medium leading-none text-[#EF4444] transition-colors hover:text-[#DC2626]"
            >
              Remove
            </button>
            <SaveButton />
          </div>
        </SettingsRow>

        <SettingsRow>
          <div className="mb-[16px] flex items-end justify-between gap-[16px]">
            <div>
              <h3 className="text-[13px] font-medium leading-none text-[#171717]">Role</h3>
              <p className="mt-[4px] text-[12px] font-normal leading-none text-[#525252]">
                This helps Stage tailor the experience for you.
              </p>
            </div>
            <SaveButton />
          </div>
          <div className="grid grid-cols-4 gap-[4px]">
            {profile.roles.map((role) => {
              const active = role.id === selectedRole;
              return (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => setSelectedRole(role.id)}
                  className={`flex min-h-[64px] cursor-pointer items-center justify-center gap-[8px] rounded-[6px] px-[12px] py-[24px] text-[12px] font-medium leading-none transition-colors outline-none ${
                    active
                      ? "bg-[#E8E6FF] text-[#14113F] ring-1 ring-inset ring-[#8782F5]/25"
                      : "bg-[#F5F5F5] text-[#525252] hover:bg-[#EFEFEF]"
                  }`}
                >
                  <SettingsIcon name={role.icon} className="h-[16px] w-[16px]" />
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
    <div className="flex flex-col gap-[22px]">
      <SettingsCard title="Current plan">
        <p className="-mt-[12px] px-[12px] pb-[12px] text-[12px] font-normal leading-[1.5] text-[#404040]">
          Your Stage subscription, checkout, and customer portal.
        </p>
        <SettingsRow>
          <div className="flex items-end justify-between gap-[20px]">
            <div className="flex flex-col gap-[24px]">
              <div>
                <p className="text-[13px] font-normal leading-[1.5] text-[#525252]">Your current plan</p>
                <p className="mt-[4px] text-[15px] font-medium leading-none text-[#171717]">{billing.planName}</p>
              </div>
              <div className="flex gap-[44px]">
                <div>
                  <p className="text-[13px] font-normal leading-[1.5] text-[#525252]">Billing Cycle</p>
                  <p className="mt-[4px] text-[13px] font-medium leading-none text-[#171717]">{billing.billingCycle}</p>
                </div>
                <div>
                  <p className="text-[13px] font-normal leading-[1.5] text-[#525252]">Renews on</p>
                  <p className="mt-[4px] text-[13px] font-medium leading-none text-[#171717]">{billing.renewsOn}</p>
                </div>
              </div>
            </div>
            <button type="button" className="rounded-[6px] border border-[rgba(158,153,248,0.75)] bg-gradient-to-b from-[#7B76DF] to-[#463FBA] px-[12px] py-[8px] text-[13px] font-medium leading-none text-[#FAFAFA] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] [text-shadow:0_0.5px_1.5px_rgba(0,0,0,0.15)]">
              Upgrade to Team Plan
            </button>
          </div>
        </SettingsRow>
      </SettingsCard>

      <SettingsCard title="Payment method">
        <p className="-mt-[12px] px-[12px] pb-[12px] text-[12px] font-normal leading-[1.5] text-[#404040]">
          Card details come from your active Stage subscription.
        </p>
        <SettingsRow>
          <div className="flex items-center justify-between gap-[20px]">
            <div className="flex items-center gap-[12px]">
              <SettingsIcon name="visa" className="h-[12px] w-auto shrink-0" />
              <span className="text-[13px] font-medium leading-[1.5] text-[#0A0A0A]">{billing.paymentMethod}</span>
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
    <SettingsCard title="Your clients">
      <p className="-mt-[12px] px-[12px] pb-[12px] text-[12px] font-normal leading-[1.5] text-[#404040]">
        Manage clients across all your projects.
      </p>
      <div className="flex flex-col gap-[4px]">
        {settingsSnapshot.clients.map((client) => (
          <SettingsRow key={client.id}>
            <div className="flex items-center justify-between gap-[18px]">
              <div className="flex flex-col gap-[12px]">
                <div className="flex items-center gap-[12px]">
                  <Avatar name={client.name} size="md" />
                  <div>
                    <h3 className="text-[13px] font-medium leading-[1.5] text-[#0A0A0A]">{client.name}</h3>
                    <p className="text-[12px] font-normal leading-[1.5] text-[#404040]">{client.email}</p>
                  </div>
                </div>
                <p className="text-[12px] font-normal leading-[1.5] text-[#737373]">
                  Already linked to active workspace history.
                </p>
              </div>
              <Badge variant="accent" className="rounded-[4px] bg-[#E7E6FD] px-[6px] py-[4px] text-[12px] font-normal leading-none text-[#221E6C]">
                {client.projectCount} Project
              </Badge>
            </div>
          </SettingsRow>
        ))}
        <div className="px-[20px] py-[6px] text-[13px] text-[#525252]">
          <span className="font-medium text-[#0A0A0A]">{totalProjects}</span> Projects <span className="px-[16px] text-[#A3A3A3]">•</span> <span className="font-medium text-[#0A0A0A]">{settingsSnapshot.clients.length}</span> Clients
        </div>
      </div>
    </SettingsCard>
  );
}

function DeveloperPanel() {
  const { developer } = settingsSnapshot;

  return (
    <SettingsCard title="Your API Key">
      <p className="-mt-[12px] px-[12px] pb-[12px] text-[12px] font-normal leading-[1.5] text-[#404040]">
        Manage your API key and Prompt Generated
      </p>
      <div className="flex flex-col gap-[4px]">
        <SettingsRow>
          <label className="mb-[8px] block text-[12px] font-medium leading-none text-[#262626]">API Key</label>
          <div className="flex min-h-[30px] items-center justify-between rounded-[6px] bg-[#F5F5F5] px-[12px] py-[6px] text-[12px] font-medium leading-none text-[#262626] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
            {developer.apiKey}
            <CopyButton
              text={developer.apiKey}
              icon={<SettingsIcon name="copy" className="h-[18px] w-[18px] text-[#737373]" />}
            />
          </div>
        </SettingsRow>
        <SettingsRow>
          <label className="mb-[8px] block text-[12px] font-medium leading-none text-[#262626]">Generated Prompt</label>
          <div className="flex items-start justify-between gap-[16px] rounded-[6px] bg-[#F5F5F5] px-[12px] py-[10px] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
            <pre className="min-h-[288px] whitespace-pre-wrap font-sans text-[12px] font-medium leading-[1.5] text-[#525252]">
              {developer.generatedPrompt}
            </pre>
            <div className="pt-1">
              <CopyButton
                text={developer.generatedPrompt}
                icon={<SettingsIcon name="copy" className="h-[18px] w-[18px] text-[#737373]" />}
              />
            </div>
          </div>
        </SettingsRow>
      </div>
    </SettingsCard>
  );
}

function AccountPanel() {
  return (
    <SettingsCard>
      <SettingsRow>
        <h2 className="text-[15px] font-semibold leading-none text-[#171717]">Delete account</h2>
        <p className="mt-[4px] max-w-[471px] text-[12px] font-normal leading-[1.5] text-[#171717]">
          Permanently delete your account and all associated projects, research, strategies,
          and generated assets. This action is immediate and cannot be undone.
        </p>
        <button type="button" className="mt-[24px] rounded-[6px] border border-[#F87171] bg-gradient-to-b from-[#EF4444] to-[#DC2626] px-[12px] py-[8px] text-[13px] font-medium leading-none text-[#FAFAFA] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] [text-shadow:0_0.5px_1.5px_rgba(0,0,0,0.15)]">
          Delete Account
        </button>
      </SettingsRow>
    </SettingsCard>
  );
}

function IntegrationsPage() {
  const { integrations } = settingsSnapshot;
  const [localIntegrations, setLocalIntegrations] = useState<Integration[]>(() => [
    ...integrations.connected,
    ...integrations.available,
  ]);
  const [integrationToDisconnect, setIntegrationToDisconnect] = useState<Integration | null>(null);
  const connectedIntegrations = localIntegrations.filter((integration) => integration.connected);
  const availableIntegrations = localIntegrations.filter((integration) => !integration.connected);

  function connectIntegration(integrationId: string) {
    setLocalIntegrations((current) =>
      current.map((integration) =>
        integration.id === integrationId
          ? { ...integration, connected: true }
          : integration,
      ),
    );
  }

  function disconnectIntegration(integrationId: string) {
    setLocalIntegrations((current) =>
      current.map((integration) =>
        integration.id === integrationId
          ? { ...integration, connected: false }
          : integration,
      ),
    );
  }

  return (
    <div className="relative flex min-h-full flex-1 justify-center overflow-hidden bg-white">
      <div className="flex min-h-full w-full max-w-[674px] flex-col justify-center gap-[24px]">
        <header>
          <h1 className="text-[20px] font-semibold leading-[1.2] text-[#0A0A0A]">
            Integrations
          </h1>
          <p className="mt-[8px] text-[13px] font-medium leading-[1.2] text-[#737373]">
            Manage all your integrations and tool connections here
          </p>
        </header>

        <div className="flex flex-col gap-[12px]">
          <IntegrationGroup title="Connected">
            <div className="flex flex-col gap-[16px] rounded-[8px] bg-white p-[20px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
              {connectedIntegrations.length > 0 ? (
                connectedIntegrations.map((integration) => (
                  <IntegrationListRow
                    key={integration.id}
                    integration={integration}
                    onToggle={() => {
                      setIntegrationToDisconnect(integration);
                    }}
                  />
                ))
              ) : (
                <p className="text-[12px] leading-none text-[#737373]">
                  No connected integrations yet
                </p>
              )}
            </div>
          </IntegrationGroup>

          <IntegrationGroup title="Available Tools">
            <div className="flex flex-col gap-[16px] rounded-[8px] bg-white p-[20px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
              {availableIntegrations.map((integration) => (
                <IntegrationListRow
                  key={integration.id}
                  integration={integration}
                  onToggle={() => connectIntegration(integration.id)}
                />
              ))}
            </div>
          </IntegrationGroup>
        </div>
      </div>

      {integrationToDisconnect ? (
        <DisconnectIntegrationDialog
          integration={integrationToDisconnect}
          onCancel={() => setIntegrationToDisconnect(null)}
          onDisconnect={() => {
            disconnectIntegration(integrationToDisconnect.id);
            setIntegrationToDisconnect(null);
          }}
        />
      ) : null}
    </div>
  );
}

function IntegrationGroup({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[12px] bg-[#F5F5F5] p-[4px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
      <h2 className="px-[12px] pb-[12px] pt-[8px] text-[13px] font-medium leading-[1.5] text-[#0A0A0A]">
        {title}
      </h2>
      {children}
    </section>
  );
}

function IntegrationListRow({
  integration,
  onToggle,
}: {
  integration: Integration;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={integration.connected}
      onClick={onToggle}
      className="flex w-full items-start justify-between gap-[18px] rounded-[6px] bg-white text-left"
    >
      <span className="flex min-w-0 items-start gap-[8px]">
        <span className="flex h-[18px] w-[16px] shrink-0 items-center justify-center pt-[1px]">
          <SettingsIcon
            name={integration.icon}
            className="h-[16px] w-[16px]"
          />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[13px] font-medium leading-[1.2] text-[#171717]">
            {integration.name}
          </span>
          <span className="mt-[2px] block truncate text-[12px] font-normal leading-[1.25] text-[#525252]">
            {integration.description}
          </span>
        </span>
      </span>
      <IntegrationToggle active={integration.connected} />
    </button>
  );
}

function IntegrationToggle({ active }: { active: boolean }) {
  return (
    <span
      className={`mt-[1px] flex h-[16px] w-[30px] shrink-0 items-center rounded-full p-[2px] ${
        active ? "justify-end bg-[#DBD9FC]" : "justify-start bg-[#E5E5E5]"
      }`}
    >
      <span
        className={`h-[12px] w-[12px] rounded-full ${
          active ? "bg-[#221E6C]" : "bg-[#737373]"
        }`}
      />
    </span>
  );
}

function DisconnectIntegrationDialog({
  integration,
  onCancel,
  onDisconnect,
}: {
  integration: Integration;
  onCancel: () => void;
  onDisconnect: () => void;
}) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/10 backdrop-blur-[5px]">
      <div className="w-[516px] rounded-[12px] bg-[#F5F5F5] p-[4px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
        <div className="rounded-[8px] bg-white p-[20px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
          <div className="flex flex-col gap-[24px]">
            <SettingsIcon name={integration.icon} className="h-[32px] w-[32px]" />
            <div className="text-[#171717]">
              <h2 className="text-[15px] font-semibold leading-none">
                Are you sure, you want to disconnect {integration.name}?
              </h2>
              <p className="mt-[4px] text-[12px] font-normal leading-[1.5]">
                You are in the process of disconnecting from {integration.name}. Please be aware that all
                operations and functionalities associated with {integration.name} will be temporarily halted
                during this disconnection. Ensure that you have saved any important work before
                proceeding.
              </p>
            </div>
          </div>

          <div className="mt-[24px] flex items-center gap-[8px]">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-[6px] bg-[#F5F5F5] px-[16px] py-[8px] text-[12px] font-medium leading-none text-[#171717] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#ECECEC]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onDisconnect}
              className="rounded-[6px] border border-[#F87171] bg-gradient-to-b from-[#EF4444] to-[#DC2626] px-[12px] py-[8px] text-[13px] font-medium leading-none text-[#FAFAFA] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-opacity hover:opacity-95 [text-shadow:0_0.5px_1.5px_rgba(0,0,0,0.15)]"
            >
              Disconnect {integration.name}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
