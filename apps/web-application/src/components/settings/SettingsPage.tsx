import { Helmet } from "react-helmet-async";
import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { ArrowLeft } from "@phosphor-icons/react";
import type { ComponentType } from "react";
import { UpgradePricingModal } from "@/components/billing/UpgradePricingModal";
import { BillingTab } from "@/components/settings/BillingTab";
import { GeneralTab } from "@/components/settings/GeneralTab";
import { IntegrationsTab } from "@/components/settings/IntegrationsTab";
import {
  AccountIcon,
  BillingIcon,
  ClientsIcon,
  DeveloperIcon,
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
import { useSettingsClients } from "@/hooks/useSettingsClients";
import { useSettingsOverview } from "@/hooks/useSettingsOverview";
import "@/styles/settings.css";
import type { SettingsTab } from "@/types/settings";

const PREVIEW_PORTAL_URL = "/portal/share_acme_2026?preview=1";

const SETTINGS_TABS: Array<{
  id: Exclude<SettingsTab, "integrations" | "portal">;
  label: string;
  icon: ComponentType;
}> = [
  { id: "general", label: "Profile", icon: ProfileIcon },
  { id: "billing", label: "Plans & Billing", icon: BillingIcon },
  { id: "clients", label: "Clients", icon: ClientsIcon },
  { id: "developer", label: "Developer", icon: DeveloperIcon },
  { id: "account", label: "Account", icon: AccountIcon },
];

export function SettingsPage() {
  const { user } = useAuth();
  const { data: settingsData } = useSettingsOverview();
  const { activeTab, setActiveTab, openBillingTab } = useSettingsTabs();
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
    isPro: billingSettings.isPro,
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
  const isIntegrationsPage = activeTab === "integrations";
  const isPortalPage = activeTab === "portal";
  const pageTitle = isIntegrationsPage
    ? "Integrations"
    : isPortalPage
      ? "Client Portal"
      : "Settings";
  const pageSubtitle = isIntegrationsPage
    ? "Manage all your integrations and tool connections here"
    : isPortalPage
      ? "Manage your shared client workspace"
      : "Manage your account";

  return (
    <>
      <Helmet>
        <title>Settings — Stage</title>
      </Helmet>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className={`settings-page settings-page-shell ${
          isIntegrationsPage ? "settings-page-shell--integrations" : ""
        } ${isPortalPage ? "settings-page-shell--portal" : ""}`}
      >
        <Link
          to="/dashboard"
          className="settings-back-link"
        >
          <ArrowLeft size={14} />
          Back to dashboard
        </Link>

        <div className="settings-page-header">
          <h1 className="page-title sf">{pageTitle}</h1>
          <p className="page-subtitle">{pageSubtitle}</p>
        </div>

        <div className="settings-layout">
          {!isIntegrationsPage && !isPortalPage ? (
            <div className="settings-tabbar" aria-label="Settings sections">
              {SETTINGS_TABS.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    className={`settings-tab-button ${activeTab === tab.id ? "active" : ""}`}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    <Icon />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          ) : null}

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
              isPro={billingSettings.isPro}
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
              isPro={billingSettings.isPro}
              claudeConnection={integrationsSettings.claudeConnection}
              notionConnection={integrationsSettings.notionConnection}
              figmaConnection={integrationsSettings.figmaConnection}
              anthropicCredential={integrationsSettings.anthropicCredential}
              claudeFeedback={integrationsSettings.claudeFeedback}
              anthropicFeedback={integrationsSettings.anthropicFeedback}
              notionFeedback={integrationsSettings.notionFeedback}
              figmaFeedback={integrationsSettings.figmaFeedback}
              isClaudeDisconnecting={integrationsSettings.isClaudeDisconnecting}
              isNotionConnecting={integrationsSettings.isNotionConnecting}
              isNotionDisconnecting={integrationsSettings.isNotionDisconnecting}
              isFigmaConnecting={integrationsSettings.isFigmaConnecting}
              isFigmaDisconnecting={integrationsSettings.isFigmaDisconnecting}
              anthropicApiKey={integrationsSettings.anthropicApiKey}
              anthropicModelPreference={integrationsSettings.anthropicModelPreference}
              isAnthropicSaving={integrationsSettings.isAnthropicSaving}
              isAnthropicTesting={integrationsSettings.isAnthropicTesting}
              claudeSetupHref={integrationsSettings.claudeSetupHref}
              claudeInstallCommand={integrationsSettings.claudeInstallCommand}
              claudeVerifyPrompt={integrationsSettings.claudeVerifyPrompt}
              onClaudeDisconnect={() => void integrationsSettings.handleClaudeDisconnect()}
              onNotionConnect={() => void integrationsSettings.handleNotionConnect()}
              onNotionDisconnect={() => void integrationsSettings.handleNotionDisconnect()}
              onFigmaConnect={() => void integrationsSettings.handleFigmaConnect()}
              onFigmaDisconnect={() => void integrationsSettings.handleFigmaDisconnect()}
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
              onOpenDeveloperSettings={() => setActiveTab("developer")}
              onUpgradeClick={openBillingTab}
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

    </>
  );
}
