import { Helmet } from "react-helmet-async";
import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { ArrowLeft } from "@phosphor-icons/react";
import { UpgradePricingModal } from "@/components/billing/UpgradePricingModal";
import { ProjectDock } from "@/components/dashboard/ProjectDock";
import { BillingTab } from "@/components/settings/BillingTab";
import { GeneralTab } from "@/components/settings/GeneralTab";
import { IntegrationsTab } from "@/components/settings/IntegrationsTab";
import {
  AccountIcon,
  BillingIcon,
  ClientsIcon,
  DeveloperIcon,
  IntegrationsLinkIcon,
  ProfileIcon,
} from "@/components/settings/SettingsIcons";
import { AccountTab } from "@/components/settings/AccountTab";
import { ClientsTab } from "@/components/settings/ClientsTab";
import { DeveloperTab } from "@/components/settings/DeveloperTab";
import { PortalTab } from "@/components/settings/PortalTab";
import { useAuth } from "@/lib/auth";
import { GOOGLE_SHEETS_GUIDE_HREF } from "@/features/settings/googleSheetsErrors";
import { useBillingSettings } from "@/features/settings/useBillingSettings";
import { useGeneralSettings } from "@/features/settings/useGeneralSettings";
import { useIntegrationsSettings } from "@/features/settings/useIntegrationsSettings";
import { usePortalBrandingSettings } from "@/features/settings/usePortalBrandingSettings";
import { useDeveloperSettings } from "@/features/settings/useDeveloperSettings";
import { useSettingsTabs } from "@/features/settings/useSettingsTabs";
import { useDockProjects } from "@/hooks/useDockProjects";
import { useSettingsClients } from "@/hooks/useSettingsClients";
import { useSettingsOverview } from "@/hooks/useSettingsOverview";
import "@/styles/settings.css";

const PREVIEW_PORTAL_URL = "/portal/share_acme_2026?preview=1";

export function SettingsPage() {
  const { user } = useAuth();
  const { data: settingsData } = useSettingsOverview();
  const { activeTab, setActiveTab, openBillingTab } = useSettingsTabs();
  const dockProjects = useDockProjects();
  const { clients, isLoading: clientsLoading } = useSettingsClients(activeTab === "clients");
  const generalSettings = useGeneralSettings({
    user,
    profileName: settingsData?.profile.name,
    profileAvatarUrl: settingsData?.profile.avatarUrl,
  });
  const billingSettings = useBillingSettings({
    profilePlan: settingsData?.profile.plan,
    subscription: settingsData?.subscription ?? null,
  });
  const integrationsSettings = useIntegrationsSettings({
    user,
    enabled: activeTab === "integrations",
  });
  const developerSettings = useDeveloperSettings({
    enabled: activeTab === "developer",
  });
  const portalBrandingSettings = usePortalBrandingSettings({
    previewPortalUrl: PREVIEW_PORTAL_URL,
    portalLogoUrl: settingsData?.portalBranding.logoUrl,
    portalAccentColor: settingsData?.portalBranding.accentColor ?? undefined,
  });
  const previewPortalUrl = PREVIEW_PORTAL_URL;

  return (
    <>
      <Helmet>
        <title>Settings — Stage</title>
      </Helmet>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="settings-page mx-auto flex w-full max-w-[1200px] flex-col px-4 pb-[120px] pt-4 sm:px-10 sm:pt-6 lg:px-14"
      >
        <Link
          to="/dashboard"
          className="mb-2 ml-1 inline-flex w-fit items-center gap-1 text-[13px] text-text-secondary transition-colors hover:text-text-primary sm:ml-0"
        >
          <ArrowLeft size={14} />
          Dashboard
        </Link>

        <div className="settings-page-header">
          <h1 className="page-title sf">Settings</h1>
          <p className="page-subtitle">Manage your account</p>
        </div>

        <div className="settings-layout">
          <aside className="settings-sidebar" aria-label="Settings sections">
            <button
              type="button"
              className={`sidebar-item ${activeTab === "general" ? "active" : ""}`}
              onClick={() => setActiveTab("general")}
            >
              <ProfileIcon />
              Profile
            </button>
            <button
              type="button"
              className={`sidebar-item ${activeTab === "integrations" ? "active" : ""}`}
              onClick={() => setActiveTab("integrations")}
            >
              <IntegrationsLinkIcon />
              Integrations
            </button>
            <button
              type="button"
              className={`sidebar-item ${activeTab === "billing" ? "active" : ""}`}
              onClick={() => setActiveTab("billing")}
            >
              <BillingIcon />
              Plan &amp; Billing
            </button>
            <button
              type="button"
              className={`sidebar-item ${activeTab === "clients" ? "active" : ""}`}
              onClick={() => setActiveTab("clients")}
            >
              <ClientsIcon />
              Clients
            </button>
            <button
              type="button"
              className={`sidebar-item ${activeTab === "developer" ? "active" : ""}`}
              onClick={() => setActiveTab("developer")}
            >
              <DeveloperIcon />
              Developer
            </button>
            <button
              type="button"
              className={`sidebar-item ${activeTab === "account" ? "active" : ""}`}
              onClick={() => setActiveTab("account")}
            >
              <AccountIcon />
              Account
            </button>
          </aside>

          <div className="settings-content">
            <GeneralTab
              active={activeTab === "general"}
              name={generalSettings.name}
              avatarDataUrl={generalSettings.avatarDataUrl}
              avatarInitial={generalSettings.avatarInitial}
              avatarInputRef={generalSettings.avatarInputRef}
              isSavingName={generalSettings.isSavingName}
              isSavingAvatar={generalSettings.isSavingAvatar}
              nameFeedback={generalSettings.nameFeedback}
              avatarFeedback={generalSettings.avatarFeedback}
              onNameChange={generalSettings.setName}
              onAvatarInputChange={generalSettings.handleAvatarInputChange}
              onSaveName={() => void generalSettings.persistName()}
              onSaveAvatar={() => void generalSettings.persistAvatar()}
            />

            <BillingTab
              active={activeTab === "billing"}
              planName={billingSettings.planName}
              planStatus={billingSettings.planStatus}
              planCycle={billingSettings.planCycle}
              paymentText={billingSettings.paymentText}
              paymentProviderText={billingSettings.paymentProviderText}
              billingFeedback={billingSettings.billingFeedback}
              isCheckoutLoading={billingSettings.isCheckoutLoading}
              isPortalLoading={billingSettings.isPortalLoading}
              hasActiveSubscription={billingSettings.hasActiveSubscription}
              onOpenUpgradePricing={() => billingSettings.setUpgradePricingOpen(true)}
              onOpenPortal={() => void billingSettings.handleOpenPortal()}
            />

            <IntegrationsTab
              active={activeTab === "integrations"}
              claudeConnection={integrationsSettings.claudeConnection}
              claudeTools={integrationsSettings.claudeTools}
              anthropicCredential={integrationsSettings.anthropicCredential}
              claudeFeedback={integrationsSettings.claudeFeedback}
              anthropicFeedback={integrationsSettings.anthropicFeedback}
              isClaudeDisconnecting={integrationsSettings.isClaudeDisconnecting}
              anthropicApiKey={integrationsSettings.anthropicApiKey}
              anthropicModelPreference={integrationsSettings.anthropicModelPreference}
              isAnthropicSaving={integrationsSettings.isAnthropicSaving}
              isAnthropicTesting={integrationsSettings.isAnthropicTesting}
              claudeSetupHref={integrationsSettings.claudeSetupHref}
              claudeInstallCommand={integrationsSettings.claudeInstallCommand}
              claudeVerifyPrompt={integrationsSettings.claudeVerifyPrompt}
              onClaudeDisconnect={() => void integrationsSettings.handleClaudeDisconnect()}
              onAnthropicApiKeyChange={integrationsSettings.setAnthropicApiKey}
              onAnthropicModelPreferenceChange={integrationsSettings.setAnthropicModelPreference}
              onAnthropicSave={() => void integrationsSettings.handleAnthropicSave()}
              onAnthropicTest={() => void integrationsSettings.handleAnthropicTest()}
              stripeConnection={integrationsSettings.stripeConnection}
              stripeFeedback={integrationsSettings.stripeFeedback}
              isStripeConnecting={integrationsSettings.isStripeConnecting}
              isStripeSyncing={integrationsSettings.isStripeSyncing}
              isStripeDisconnecting={integrationsSettings.isStripeDisconnecting}
              onStripeConnect={() => void integrationsSettings.handleStripeConnect()}
              onStripeSync={() => void integrationsSettings.handleStripeSync()}
              onStripeDisconnect={() => void integrationsSettings.handleStripeDisconnect()}
              stripeGuideHref={null}
              googleSheetsGuideHref={GOOGLE_SHEETS_GUIDE_HREF}
              googleSheetUrl={integrationsSettings.googleSheetUrl}
              googleSheetConnection={integrationsSettings.sheetConnection}
              googleSheetFeedback={integrationsSettings.googleSheetFeedback}
              isGoogleSheetConnecting={integrationsSettings.isGoogleSheetConnecting}
              isGoogleSheetImporting={integrationsSettings.isGoogleSheetImporting}
              isGoogleSheetDisconnecting={integrationsSettings.isGoogleSheetDisconnecting}
              onGoogleSheetUrlChange={integrationsSettings.setGoogleSheetUrl}
              onGoogleSheetConnect={() => void integrationsSettings.handleGoogleSheetConnect()}
              onGoogleSheetImport={() => void integrationsSettings.handleGoogleSheetImport()}
              onGoogleSheetDisconnect={() => void integrationsSettings.handleGoogleSheetDisconnect()}
              googleSheetHelpDialogOpen={integrationsSettings.googleSheetHelpDialogOpen}
              googleSheetHelpDialogTitle={integrationsSettings.googleSheetHelpDialogTitle}
              googleSheetHelpDialogMessage={integrationsSettings.googleSheetHelpDialogMessage}
              onGoogleSheetHelpDialogOpenChange={integrationsSettings.setGoogleSheetHelpDialogOpen}
            />

            <PortalTab
              active={activeTab === "portal"}
              isPro={billingSettings.isPro}
              previewPortalUrl={previewPortalUrl}
              portalLogoDataUrl={portalBrandingSettings.portalLogoDataUrl}
              portalColor={portalBrandingSettings.portalColor}
              hexInput={portalBrandingSettings.hexInput}
              logoDragActive={portalBrandingSettings.logoDragActive}
              logoInputRef={portalBrandingSettings.logoInputRef}
              isSavingPortalLogo={portalBrandingSettings.isSavingPortalLogo}
              isSavingPortalColor={portalBrandingSettings.isSavingPortalColor}
              portalLogoFeedback={portalBrandingSettings.portalLogoFeedback}
              portalColorFeedback={portalBrandingSettings.portalColorFeedback}
              onPreviewPortalClick={portalBrandingSettings.handlePreviewPortalClick}
              onLogoInputChange={portalBrandingSettings.handleLogoInputChange}
              onLogoDrop={portalBrandingSettings.handleLogoDrop}
              onLogoDragOver={portalBrandingSettings.handleLogoDragOver}
              onLogoDragLeave={portalBrandingSettings.handleLogoDragLeave}
              onLogoRemove={portalBrandingSettings.handleLogoRemove}
              onPortalColorInput={portalBrandingSettings.handlePortalColorInput}
              onHexInputChange={portalBrandingSettings.handleHexInputChange}
              onHexInputBlur={portalBrandingSettings.handleHexInputBlur}
              onUpgradeClick={openBillingTab}
              onSavePortalLogo={() => void portalBrandingSettings.persistPortalLogo()}
              onSavePortalColor={() => void portalBrandingSettings.persistPortalColor()}
            />

            <DeveloperTab
              active={activeTab === "developer"}
              isPro={billingSettings.isPro}
              keys={developerSettings.keys}
              keyName={developerSettings.keyName}
              isCreating={developerSettings.isCreating}
              isRevoking={developerSettings.isRevoking}
              revealedKey={developerSettings.revealedKey}
              copied={developerSettings.copied}
              feedback={developerSettings.feedback}
              onKeyNameChange={developerSettings.setKeyName}
              onCreate={() => void developerSettings.handleCreate()}
              onRevoke={(keyId) => void developerSettings.handleRevoke(keyId)}
              onCopyKey={() => void developerSettings.handleCopyKey()}
              onDismissRevealedKey={developerSettings.dismissRevealedKey}
              onUpgradeClick={openBillingTab}
            />

            <ClientsTab
              active={activeTab === "clients"}
              clients={clients}
              isLoading={clientsLoading}
            />

            <AccountTab
              active={activeTab === "account"}
              isDeletingAccount={generalSettings.isDeletingAccount}
              deleteAccountFeedback={generalSettings.deleteAccountFeedback}
              onDeleteAccount={generalSettings.handleDeleteAccount}
            />
          </div>
        </div>
      </motion.div>

      <UpgradePricingModal
        open={billingSettings.upgradePricingOpen}
        onClose={() => {
          if (billingSettings.isCheckoutLoading) {
            return;
          }
          billingSettings.setUpgradePricingOpen(false);
        }}
        onUpgrade={(billingCycle) => {
          void billingSettings.handleStartCheckout(billingCycle);
        }}
        isLoading={billingSettings.isCheckoutLoading}
        errorMessage={
          billingSettings.billingFeedback.kind === "error"
            ? billingSettings.billingFeedback.message
            : null
        }
      />

      <ProjectDock projects={dockProjects} />
    </>
  );
}
