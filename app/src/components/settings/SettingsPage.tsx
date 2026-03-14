import { useQuery as useConvexQuery } from "convex/react";
import { Helmet } from "react-helmet-async";
import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { ArrowLeft } from "@phosphor-icons/react";
import { UpgradePricingModal } from "@/components/billing/UpgradePricingModal";
import { BillingTab } from "@/components/settings/BillingTab";
import { GeneralTab } from "@/components/settings/GeneralTab";
import { IntegrationsTab } from "@/components/settings/IntegrationsTab";
import {
  BillingIcon,
  GeneralIcon,
  IntegrationsIcon,
  PortalIcon,
} from "@/components/settings/SettingsIcons";
import { PortalTab } from "@/components/settings/PortalTab";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/convex";
import { GOOGLE_SHEETS_GUIDE_HREF } from "@/features/settings/googleSheetsErrors";
import { useBillingSettings } from "@/features/settings/useBillingSettings";
import { useGeneralSettings } from "@/features/settings/useGeneralSettings";
import { useIntegrationsSettings } from "@/features/settings/useIntegrationsSettings";
import { usePortalBrandingSettings } from "@/features/settings/usePortalBrandingSettings";
import { useSettingsTabs } from "@/features/settings/useSettingsTabs";
import "@/styles/settings.css";

const PREVIEW_PORTAL_URL = "/portal/share_acme_2026?preview=1";

export function SettingsPage() {
  const { user } = useAuth();
  const settingsData = useConvexQuery(api.settings.getOverview, !user ? "skip" : {});
  const { activeTab, setActiveTab, openBillingTab } = useSettingsTabs();
  const generalSettings = useGeneralSettings({
    user,
    profileName: settingsData?.profile.name,
    profileAvatarUrl: settingsData?.profile.avatarUrl,
  });
  const billingSettings = useBillingSettings({
    profilePlan: settingsData?.profile.plan,
    subscription: settingsData?.subscription ?? null,
  });
  const integrationsSettings = useIntegrationsSettings({ user });
  const portalBrandingSettings = usePortalBrandingSettings({
    previewPortalUrl: settingsData?.previewPortalUrl ?? undefined,
    portalLogoUrl: settingsData?.portalBranding.logoUrl,
    portalAccentColor: settingsData?.portalBranding.accentColor ?? undefined,
  });
  const previewPortalUrl = settingsData?.previewPortalUrl ?? PREVIEW_PORTAL_URL;

  return (
    <>
      <Helmet>
        <title>Settings — Stage</title>
      </Helmet>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="settings-page mx-auto flex w-full max-w-[1200px] flex-col px-6 pb-[120px] pt-6 sm:px-10 lg:px-14"
      >
        <Link
          to="/dashboard"
          className="mb-2 inline-flex w-fit items-center gap-1 text-[13px] text-text-secondary transition-colors hover:text-text-primary"
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
              <GeneralIcon />
              General
            </button>
            <button
              type="button"
              className={`sidebar-item ${activeTab === "billing" ? "active" : ""}`}
              onClick={() => setActiveTab("billing")}
            >
              <BillingIcon />
              Billing
            </button>
            <button
              type="button"
              className={`sidebar-item ${activeTab === "integrations" ? "active" : ""}`}
              onClick={() => setActiveTab("integrations")}
            >
              <IntegrationsIcon />
              Integrations
            </button>
            <button
              type="button"
              className={`sidebar-item ${activeTab === "portal" ? "active" : ""}`}
              onClick={() => setActiveTab("portal")}
            >
              <PortalIcon />
              Client Portal
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
              isDeletingAccount={generalSettings.isDeletingAccount}
              nameFeedback={generalSettings.nameFeedback}
              avatarFeedback={generalSettings.avatarFeedback}
              deleteAccountFeedback={generalSettings.deleteAccountFeedback}
              onNameChange={generalSettings.setName}
              onAvatarInputChange={generalSettings.handleAvatarInputChange}
              onSaveName={() => void generalSettings.persistName()}
              onSaveAvatar={() => void generalSettings.persistAvatar()}
              onDeleteAccount={generalSettings.handleDeleteAccount}
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
