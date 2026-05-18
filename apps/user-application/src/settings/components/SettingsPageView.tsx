import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAction, useMutation } from "convex/react";
import { z } from "zod";
import { ClientPortalSettingsView } from "@/client-portal/components/ClientPortalSettingsView";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { useClientsQuery, useSettingsOverviewQuery } from "@/hooks/desktop-api";
import { useDesktopBridge } from "@/hooks/useDesktopBridge";
import { api } from "@/lib/convexApi";
import {
  AVATAR_ACCEPT,
  prepareAvatarUpload,
  uploadFileToR2,
} from "@/lib/r2Uploads";
import { settingsSnapshot } from "../data/settingsSnapshot";
import type { Integration, SettingsTab } from "../models/settings";
import type { DesktopSession } from "@shared/models/desktop";
import { SettingsIcon } from "./SettingsIcons";
import { SaveButton, SettingsCard, SettingsRow, CopyButton } from "./SettingsPrimitives";

const CANCELLATION_FORM_URL = "https://tally.so/r/D4eYOE";

const SETTINGS_TABS: Array<{ key: SettingsTab; label: string; icon: string }> = [
  { key: "profile", label: "Profile", icon: "profile" },
  { key: "billing", label: "Plans & Billing", icon: "billing" },
  { key: "clients", label: "Clients", icon: "clients" },
  { key: "developer", label: "Developer", icon: "developer" },
  { key: "account", label: "Account", icon: "account" },
];

const SETTINGS_TAB_ICON_PATHS: { [key: string]: string } = {
  profile: "/logos/dashboard/profile.svg",
  billing: "/logos/dashboard/billing.svg",
  clients: "/logos/dashboard/clients.svg",
  developer: "/logos/dashboard/developer.svg",
  account: "/logos/dashboard/account.svg",
};

const profileUpdateResultSchema = z.object({
  email: z.string(),
  name: z.string(),
  avatarUrl: z.string().nullable(),
});

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
    return <IntegrationsPage />;
  }

  if (activeTab === "portal") {
    return <ClientPortalSettingsView />;
  }

  return (
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
            <SettingsTabIcon name={tab.icon} />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

function SettingsTabIcon({ name }: { name: string }) {
  const iconPath = SETTINGS_TAB_ICON_PATHS[name] ?? SETTINGS_TAB_ICON_PATHS.profile;

  return (
    <span
      aria-hidden="true"
      className="h-[15px] w-[15px] shrink-0 bg-current"
      style={{
        WebkitMask: `url("${iconPath}") center / contain no-repeat`,
        mask: `url("${iconPath}") center / contain no-repeat`,
      }}
    />
  );
}

function ProfilePanel() {
  const { profile } = settingsSnapshot;
  const overview = useSettingsOverviewQuery();
  const updateProfile = useMutation(api.settings.updateProfile);
  const generateUploadUrl = useMutation(api.r2.generateUploadUrl);
  const syncMetadata = useMutation(api.r2.syncMetadata);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const savedName = overview.data?.profile.name || profile.fullName;
  const savedAvatarUrl = overview.data?.profile.avatarUrl ?? undefined;
  const [fullName, setFullName] = useState(savedName);
  const [selectedRole, setSelectedRole] = useState(profile.selectedRole);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileNotice, setProfileNotice] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  useEffect(() => {
    setFullName(savedName);
  }, [savedName]);

  async function selectAvatarFile(file: File | undefined) {
    if (!file) return;
    setProfileError(null);
    setProfileNotice(null);
    try {
      const prepared = await prepareAvatarUpload(file);
      setAvatarFile(prepared.file);
      setAvatarPreviewUrl(prepared.previewUrl);
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "Could not prepare this avatar.");
    }
  }

  async function saveProfile() {
    setIsSavingProfile(true);
    setProfileError(null);
    setProfileNotice(null);
    try {
      const trimmedName = fullName.trim();
      const avatarKey = avatarFile
        ? await uploadFileToR2({
            generateUploadUrl,
            syncMetadata,
            purpose: "profile-avatar",
            file: avatarFile,
          })
        : undefined;
      const result = profileUpdateResultSchema.parse(
        await updateProfile(avatarKey ? { name: trimmedName, avatarKey } : { name: trimmedName }),
      );
      setFullName(result.name);
      setAvatarFile(null);
      setAvatarPreviewUrl(null);
      setProfileNotice("Profile saved.");
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "Could not save profile.");
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function removeAvatar() {
    setIsSavingProfile(true);
    setProfileError(null);
    setProfileNotice(null);
    try {
      const result = profileUpdateResultSchema.parse(
        await updateProfile({ name: fullName.trim(), avatarUrl: "" }),
      );
      setFullName(result.name);
      setAvatarFile(null);
      setAvatarPreviewUrl(null);
      setProfileNotice("Avatar removed.");
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "Could not remove avatar.");
    } finally {
      setIsSavingProfile(false);
    }
  }

  const avatarSrc = avatarPreviewUrl ?? savedAvatarUrl;

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
            <SaveButton onClick={saveProfile} disabled={isSavingProfile}>
              {isSavingProfile ? "Saving" : "Save"}
            </SaveButton>
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
            <Avatar name={fullName} src={avatarSrc} size="lg" className="h-[56px] w-[56px]" />
            <input
              ref={avatarInputRef}
              type="file"
              accept={AVATAR_ACCEPT}
              className="hidden"
              onChange={(event) => {
                void selectAvatarFile(event.target.files?.[0]);
                event.currentTarget.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              className="inline-flex cursor-pointer items-center gap-[6px] pl-[12px] text-[12px] font-medium leading-none text-[#525252] transition-colors hover:text-[#171717]"
            >
              <SettingsIcon name="upload" className="h-[16px] w-[16px]" />
              Reupload
            </button>
            <span className="flex-1" />
            <button
              type="button"
              onClick={() => void removeAvatar()}
              disabled={isSavingProfile || (!avatarSrc && !avatarFile)}
              className="cursor-pointer text-[12px] font-medium leading-none text-[#EF4444] transition-colors hover:text-[#DC2626]"
            >
              Remove
            </button>
            <SaveButton onClick={saveProfile} disabled={isSavingProfile}>
              {isSavingProfile ? "Saving" : "Save"}
            </SaveButton>
          </div>
          {profileError ? <p className="mt-[10px] text-[12px] font-medium text-[#b91c1c]">{profileError}</p> : null}
          {profileNotice ? <p className="mt-[10px] text-[12px] font-medium text-[#166534]">{profileNotice}</p> : null}
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
  const navigate = useNavigate();
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
            <button
              type="button"
              onClick={() => {
                sessionStorage.setItem("stage:subscriptions-back-label", "Back to billing");
                void navigate({ to: "/subscriptions" });
              }}
              className="rounded-[6px] border border-[rgba(158,153,248,0.75)] bg-gradient-to-b from-[#7B76DF] to-[#463FBA] px-[12px] py-[8px] text-[13px] font-medium leading-none text-[#FAFAFA] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] [text-shadow:0_0.5px_1.5px_rgba(0,0,0,0.15)]"
            >
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
  const clientsQuery = useClientsQuery();
  const clients = clientsQuery.data ?? [];
  const totalProjects = useMemo(
    () => clients.reduce((sum, client) => sum + client.projectCount, 0),
    [clients],
  );

  return (
    <SettingsCard title="Your clients">
      <p className="-mt-[12px] px-[12px] pb-[12px] text-[12px] font-normal leading-[1.5] text-[#404040]">
        Manage clients across all your projects.
      </p>
      <div className="flex flex-col gap-[4px]">
        {clientsQuery.isLoading ? (
          <SettingsRow>
            <p className="text-[12px] font-normal leading-[1.5] text-[#737373]">
              Loading clients...
            </p>
          </SettingsRow>
        ) : null}
        {!clientsQuery.isLoading && clients.length === 0 ? (
          <SettingsRow>
            <p className="text-[12px] font-normal leading-[1.5] text-[#737373]">
              No clients yet. Create a project with a client to see them here.
            </p>
          </SettingsRow>
        ) : null}
        {clients.map((client) => (
          <SettingsRow key={client.id}>
            <div className="flex items-center justify-between gap-[18px]">
              <div className="flex flex-col gap-[12px]">
                <div className="flex items-center gap-[12px]">
                  <Avatar name={client.name} src={client.avatarUrl} size="md" />
                  <div>
                    <h3 className="text-[13px] font-medium leading-[1.5] text-[#0A0A0A]">{client.name}</h3>
                    <p className="text-[12px] font-normal leading-[1.5] text-[#404040]">{client.email ?? "No email"}</p>
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
          <span className="font-medium text-[#0A0A0A]">{totalProjects}</span> Projects <span className="px-[16px] text-[#A3A3A3]">•</span> <span className="font-medium text-[#0A0A0A]">{clients.length}</span> Clients
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
  const desktop = useDesktopBridge();
  const deleteAccount = useAction(api.settings.deleteAccount);
  const [authStatus, setAuthStatus] = useState<
    "checking" | "connected" | "idle" | "opening" | "opened" | "error"
  >("checking");
  const [desktopSession, setDesktopSession] = useState<DesktopSession | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  useEffect(() => {
    desktop.auth.getSession()
      .then((session) => {
        setDesktopSession(session);
        setAuthStatus(session?.hasAccessToken ? "connected" : "idle");
      })
      .catch(() => setAuthStatus("idle"));

    return desktop.auth.onSessionChanged((session) => {
      setDesktopSession(session);
      setAuthStatus(session?.hasAccessToken ? "connected" : "idle");
    });
  }, [desktop.auth]);

  async function openDesktopLogin() {
    setAuthStatus("opening");

    try {
      await desktop.auth.openLogin();
      setAuthStatus("opened");
    } catch {
      setAuthStatus("error");
    }
  }

  function openCancellationForm() {
    void openExternalLink(CANCELLATION_FORM_URL);
  }

  function openDeleteDialog() {
    setDeleteError(null);
    setIsDeleteDialogOpen(true);
    openCancellationForm();
  }

  async function confirmDeleteAccount(confirmation: string) {
    setIsDeletingAccount(true);
    setDeleteError(null);
    try {
      await deleteAccount({ confirmation });
      await desktop.auth.logout();
      setIsDeleteDialogOpen(false);
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "Could not delete account.");
    } finally {
      setIsDeletingAccount(false);
    }
  }

  const authStatusLabel =
    authStatus === "opening"
      ? "Opening browser"
      : authStatus === "checking"
        ? "Checking session"
        : authStatus === "connected"
          ? "Connected to Stage web"
          : authStatus === "opened"
            ? "Browser opened"
            : authStatus === "error"
              ? "Could not open browser"
              : "Not connected";

  return (
    <div className="flex flex-col gap-[22px]">
      <SettingsCard title="Desktop session">
        <SettingsRow>
          <div className="flex items-center justify-between gap-[20px]">
            <div>
              <h2 className="text-[15px] font-semibold leading-none text-[#171717]">Stage web session</h2>
              <p className="mt-[4px] max-w-[471px] text-[12px] font-normal leading-[1.5] text-[#171717]">
                {desktopSession?.name ?? desktopSession?.email ?? authStatusLabel}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void openDesktopLogin()}
              disabled={authStatus === "opening" || authStatus === "checking"}
              className="rounded-[6px] border border-[rgba(158,153,248,0.75)] bg-gradient-to-b from-[#7B76DF] to-[#463FBA] px-[12px] py-[8px] text-[13px] font-medium leading-none text-[#FAFAFA] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-opacity [text-shadow:0_0.5px_1.5px_rgba(0,0,0,0.15)] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {authStatus === "connected" ? "Refresh session" : "Log in with Stage"}
            </button>
          </div>
        </SettingsRow>
      </SettingsCard>

      <SettingsCard>
        <SettingsRow>
          <h2 className="text-[15px] font-semibold leading-none text-[#171717]">Delete account</h2>
          <p className="mt-[4px] max-w-[471px] text-[12px] font-normal leading-[1.5] text-[#171717]">
            Permanently delete your account and all associated projects, research, strategies,
            and generated assets. This action is immediate and cannot be undone.
          </p>
          <button
            type="button"
            onClick={openDeleteDialog}
            className="mt-[24px] rounded-[6px] border border-[#F87171] bg-gradient-to-b from-[#EF4444] to-[#DC2626] px-[12px] py-[8px] text-[13px] font-medium leading-none text-[#FAFAFA] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-opacity hover:opacity-95 [text-shadow:0_0.5px_1.5px_rgba(0,0,0,0.15)]"
          >
            Delete Account
          </button>
        </SettingsRow>
      </SettingsCard>

      {isDeleteDialogOpen ? (
        <DeleteAccountDialog
          onCancel={() => setIsDeleteDialogOpen(false)}
          onOpenCancellationForm={openCancellationForm}
          onConfirm={(confirmation) => void confirmDeleteAccount(confirmation)}
          error={deleteError}
          isDeleting={isDeletingAccount}
        />
      ) : null}
    </div>
  );
}

async function openExternalLink(url: string) {
  if (window.stageDesktop?.shell?.openExternal) {
    await window.stageDesktop.shell.openExternal(url);
    return;
  }

  window.open(url, "_blank", "noopener,noreferrer");
}

function DeleteAccountDialog({
  onCancel,
  onOpenCancellationForm,
  onConfirm,
  error,
  isDeleting,
}: {
  onCancel: () => void;
  onOpenCancellationForm: () => void;
  onConfirm: (confirmation: string) => void;
  error: string | null;
  isDeleting: boolean;
}) {
  const [confirmationText, setConfirmationText] = useState("");
  const canDelete = confirmationText === "DELETE" && !isDeleting;

  function confirmDelete() {
    if (!canDelete) return;
    onConfirm(confirmationText);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/10 p-[24px] backdrop-blur-[5px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-account-title"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-[516px] rounded-[12px] bg-[#F5F5F5] p-[4px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="rounded-[8px] bg-white p-[20px] text-[#171717] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
          <h2 id="delete-account-title" className="text-[15px] font-semibold leading-none">
            Delete account
          </h2>
          <p className="mt-[8px] text-[12px] font-normal leading-[1.5] text-[#404040]">
            This deletes your account, projects, uploads, billing state, Stripe connections,
            Google Sheets connections, and active sessions.
          </p>
          <p className="mt-[16px] text-[12px] font-normal leading-[1.5] text-[#404040]">
            We also opened a short cancellation form in a new tab. If it did not open,{" "}
            <button
              type="button"
              onClick={onOpenCancellationForm}
              className="text-[#8D87FF] underline underline-offset-[3px] transition-colors hover:text-[#7B76DF]"
            >
              open it here.
            </button>
          </p>
          <label className="mt-[16px] block">
            <span className="text-[12px] font-normal leading-[1.5] text-[#404040]">
              Type <span className="font-medium">DELETE</span> to confirm.
            </span>
            <input
              value={confirmationText}
              onChange={(event) => setConfirmationText(event.target.value)}
              autoFocus
              placeholder="DELETE"
              className="mt-[8px] h-[38px] w-full rounded-[6px] border border-[#D4D4D4] bg-[#F5F5F5] px-[12px] text-[13px] font-medium leading-none text-[#171717] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] outline-none placeholder:text-[#A3A3A3] focus:border-[#D4D4D4] focus:bg-white"
            />
          </label>
          {error ? <p className="mt-[10px] text-[12px] font-medium text-[#b91c1c]">{error}</p> : null}

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
              disabled={!canDelete}
              onClick={confirmDelete}
              className="rounded-[6px] border border-[#F87171] bg-gradient-to-b from-[#EF4444] to-[#DC2626] px-[12px] py-[8px] text-[13px] font-medium leading-none text-[#FAFAFA] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-opacity enabled:hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-40 [text-shadow:0_0.5px_1.5px_rgba(0,0,0,0.15)]"
            >
              {isDeleting ? "Deleting..." : "Delete Account"}
            </button>
          </div>
        </div>
      </div>
    </div>
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
    <div className="relative flex min-h-full flex-1 justify-center overflow-x-hidden bg-white px-[clamp(16px,7vw,100px)] py-[clamp(20px,4vw,44px)]">
      <div className="flex w-full max-w-[674px] flex-col gap-[24px]">
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
            <div className="flex flex-col gap-[16px] rounded-[8px] bg-white p-[clamp(14px,3vw,20px)] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
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
            <div className="flex flex-col gap-[16px] rounded-[8px] bg-white p-[clamp(14px,3vw,20px)] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
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
      className="flex w-full items-start justify-between gap-[12px] rounded-[6px] bg-white text-left"
    >
      <span className="flex min-w-0 items-start gap-[10px]">
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
          <span className="mt-[2px] block text-[12px] font-normal leading-[1.35] text-[#525252]">
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
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/10 p-[16px] backdrop-blur-[5px]">
      <div className="w-full max-w-[516px] rounded-[12px] bg-[#F5F5F5] p-[4px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
        <div className="rounded-[8px] bg-white p-[clamp(14px,3vw,20px)] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
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

          <div className="mt-[24px] flex flex-col-reverse gap-[8px] sm:flex-row sm:items-center">
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
