import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type MouseEvent,
} from "react";
import {
  useAction as useConvexAction,
  useMutation as useConvexMutation,
  useQuery as useConvexQuery,
} from "convex/react";
import { Helmet } from "react-helmet-async";
import { motion } from "motion/react";
import { UpgradePricingModal } from "@/components/billing/UpgradePricingModal";
import { PRO_PRICING, type BillingCycle } from "@/components/onboarding/OnboardingPaywall";
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
import { useAuth, useSignOut } from "@/lib/auth";
import { api } from "@/lib/convex";
import { DEFAULT_PORTAL_COLOR } from "@/lib/constants";
import { toUserFacingErrorMessage } from "@/lib/errors";
import { capitalize, normalizeHex } from "@/lib/format";
import { rebaseUrlToCurrentOrigin } from "@/lib/portal";
import type { SettingsTab } from "@/types/settings";
import { googleSheetsUrlSchema, profileNameSchema } from "@/lib/validation";
import { SAVED_FEEDBACK, useFeedback } from "@/hooks/useFeedback";
import {
  uploadFileToR2,
  prepareAvatarUpload,
  preparePortalLogoUpload,
} from "@/lib/r2Uploads";
import "@/styles/settings.css";

const PREVIEW_PORTAL_URL = "/portal/share_acme_2026?preview=1";
const GOOGLE_SHEETS_GUIDE_HREF = "/help/import-transactions-via-google-sheets";
const GOOGLE_SHEETS_TRANSACTIONS_DIALOG_TITLE = "Use the Transactions tab link";
const GOOGLE_SHEETS_TRANSACTIONS_DIALOG_MESSAGE =
  "Please check the Google Sheets guide, open the Transactions tab in Google Sheets, and copy the full browser URL from the address bar. Do not use Share -> Copy link, because that link often leaves out the tab id that Stage needs.";

function extractErrorMessage(error: unknown) {
  if (typeof error === "string") {
    return error.trim();
  }

  if (error instanceof Error) {
    return error.message.trim();
  }

  return "";
}

function hasGoogleSheetGid(sheetUrl: string) {
  try {
    const url = new URL(sheetUrl);
    const gidFromSearch = url.searchParams.get("gid");
    const gidFromHash = new URLSearchParams(url.hash.replace(/^#/, "")).get("gid");
    return Boolean(gidFromSearch || gidFromHash);
  } catch {
    return false;
  }
}

function shouldShowTransactionsTabDialog(error: unknown) {
  const message = extractErrorMessage(error).toLowerCase();
  return (
    message.includes("http 400") ||
    message.includes("missing required column") ||
    message.includes("wrong tab") ||
    message.includes("transactions tab") ||
    message.includes("web page instead of sheet data")
  );
}

export function SettingsPage() {
  const { user } = useAuth();
  const settingsData = useConvexQuery(
    api.settings.getOverview,
    !user ? "skip" : {},
  );
  const stripeConnection = useConvexQuery(
    api.stripeConnect.getStripeConnectionStatus,
    !user ? "skip" : {},
  );
  const sheetConnections = useConvexQuery(
    api.googleSheets.getSheetConnectionStatus,
    !user ? "skip" : {},
  );
  const updateProfile = useConvexMutation(api.settings.updateProfile);
  const updatePortalBranding = useConvexMutation(api.settings.updatePortalBranding);
  const deleteAccount = useConvexAction(api.settings.deleteAccount);
  const connectSheet = useConvexMutation(api.googleSheets.connectSheet);
  const r2GenerateUploadUrl = useConvexMutation(api.r2.generateUploadUrl);
  const r2SyncMetadata = useConvexMutation(api.r2.syncMetadata);
  const disconnectSheet = useConvexMutation(api.googleSheets.disconnectSheet);
  const disconnectStripe = useConvexMutation(api.stripeConnect.disconnectStripe);
  const createCheckoutSession = useConvexAction(api.billing.createCheckoutSession);
  const createCustomerPortalSession = useConvexAction(api.billing.createCustomerPortalSession);
  const startStripeConnect = useConvexAction(api.stripeConnect.startConnect);
  const syncStripeData = useConvexAction(api.stripeConnect.syncStripeData);
  const runSheetImport = useConvexAction(api.googleSheets.runSheetImport);
  const signOut = useSignOut();
  const [name, setName] = useState(user?.name ?? "");
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(user?.avatarUrl ?? null);
  const [portalLogoDataUrl, setPortalLogoDataUrl] = useState<string | null>(null);
  const [portalColor, setPortalColor] = useState(DEFAULT_PORTAL_COLOR);
  const [hexInput, setHexInput] = useState(DEFAULT_PORTAL_COLOR);
  const [googleSheetUrl, setGoogleSheetUrl] = useState("");
  const [googleSheetHelpDialogOpen, setGoogleSheetHelpDialogOpen] = useState(false);
  const [googleSheetHelpDialogTitle, setGoogleSheetHelpDialogTitle] = useState(
    GOOGLE_SHEETS_TRANSACTIONS_DIALOG_TITLE,
  );
  const [googleSheetHelpDialogMessage, setGoogleSheetHelpDialogMessage] = useState(
    GOOGLE_SHEETS_TRANSACTIONS_DIALOG_MESSAGE,
  );
  const [logoDragActive, setLogoDragActive] = useState(false);
  const [isSavingName, setIsSavingName] = useState(false);
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);
  const [isSavingPortalLogo, setIsSavingPortalLogo] = useState(false);
  const [isSavingPortalColor, setIsSavingPortalColor] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [upgradePricingOpen, setUpgradePricingOpen] = useState(false);
  const [isPortalLoading, setIsPortalLoading] = useState(false);
  const [isStripeConnecting, setIsStripeConnecting] = useState(false);
  const [isStripeSyncing, setIsStripeSyncing] = useState(false);
  const [isStripeDisconnecting, setIsStripeDisconnecting] = useState(false);
  const [isGoogleSheetConnecting, setIsGoogleSheetConnecting] = useState(false);
  const [isGoogleSheetImporting, setIsGoogleSheetImporting] = useState(false);
  const [isGoogleSheetDisconnecting, setIsGoogleSheetDisconnecting] = useState(false);
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  const [pendingLogoFile, setPendingLogoFile] = useState<File | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const { feedback: nameFeedback, showFeedback: showNameFeedback } = useFeedback();
  const { feedback: avatarFeedback, showFeedback: showAvatarFeedback } = useFeedback();
  const { feedback: portalLogoFeedback, showFeedback: showPortalLogoFeedback } = useFeedback();
  const { feedback: portalColorFeedback, showFeedback: showPortalColorFeedback } = useFeedback();
  const { feedback: billingFeedback, showFeedback: showBillingFeedback } = useFeedback();
  const { feedback: stripeFeedback, showFeedback: showStripeFeedback } = useFeedback();
  const { feedback: googleSheetFeedback, showFeedback: showGoogleSheetFeedback } = useFeedback();
  const { feedback: deleteAccountFeedback, showFeedback: showDeleteAccountFeedback } =
    useFeedback();

  useEffect(() => {
    const applyTabFromUrl = () => {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (tabParam === "billing" || tabParam === "integrations" || tabParam === "portal") {
        setActiveTab(tabParam);
      } else {
        setActiveTab("general");
      }

      // Handle Stripe OAuth redirect feedback
      const stripeParam = params.get("stripe");
      if (stripeParam === "connected") {
        showStripeFeedback({ kind: "saved" });
        params.delete("stripe");
        const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`;
        window.history.replaceState({}, "", newUrl);
      } else if (stripeParam === "error") {
        const reason = params.get("reason");
        const message = reason === "missing_code"
          ? "Stripe connection failed: no authorization code received. Please try again."
          : "Something went wrong connecting Stripe. Please try again.";
        showStripeFeedback({ kind: "error", message });
        params.delete("stripe");
        params.delete("reason");
        const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`;
        window.history.replaceState({}, "", newUrl);
      }
    };

    applyTabFromUrl();
    window.addEventListener("popstate", applyTabFromUrl);
    return () => window.removeEventListener("popstate", applyTabFromUrl);
  }, []);

  useEffect(() => {
    if (!settingsData) return;
    setName(settingsData.profile.name);
    setAvatarDataUrl(settingsData.profile.avatarUrl);
    setPortalLogoDataUrl(settingsData.portalBranding.logoUrl);
    setPortalColor(settingsData.portalBranding.accentColor);
    setHexInput(settingsData.portalBranding.accentColor);
  }, [settingsData]);

  useEffect(() => {
    setGoogleSheetUrl(sheetConnections?.googleSheet?.sheetUrl ?? "");
  }, [sheetConnections?.googleSheet?.sheetUrl]);

  function showFriendlyFeedback(
    showFeedback: (feedback: { kind: "error"; message: string }) => void,
    error: unknown,
    fallback: string,
  ) {
    showFeedback({
      kind: "error",
      message: toUserFacingErrorMessage(error, fallback),
    });
  }

  function openGoogleSheetHelpDialog(title: string, message: string) {
    setGoogleSheetHelpDialogTitle(title);
    setGoogleSheetHelpDialogMessage(message);
    setGoogleSheetHelpDialogOpen(true);
  }

  const avatarInitial = name.trim().charAt(0).toUpperCase() || "S";

  function handleAvatarInputChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    void prepareAvatarUpload(file)
      .then((prepared) => {
        setPendingAvatarFile(prepared.file);
        setAvatarDataUrl(prepared.previewUrl);
      })
      .catch((error) => {
        showFriendlyFeedback(showAvatarFeedback, error, "Could not prepare this image.");
      });
  }

  function handleLogoInputChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    void preparePortalLogoUpload(file)
      .then((prepared) => {
        setPendingLogoFile(prepared.file);
        setPortalLogoDataUrl(prepared.previewUrl);
      })
      .catch((error) => {
        showFriendlyFeedback(showPortalLogoFeedback, error, "Could not prepare this image.");
      });
  }

  function handleLogoDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setLogoDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    void preparePortalLogoUpload(file)
      .then((prepared) => {
        setPendingLogoFile(prepared.file);
        setPortalLogoDataUrl(prepared.previewUrl);
      })
      .catch((error) => {
        showFriendlyFeedback(showPortalLogoFeedback, error, "Could not prepare this image.");
      });
  }

  function handlePortalColorInput(value: string) {
    const normalized = normalizeHex(value);
    if (!normalized) return;
    setPortalColor(normalized);
    setHexInput(normalized);
  }

  function handleHexInputChange(e: ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setHexInput(value.toUpperCase());
    const normalized = normalizeHex(value);
    if (normalized) {
      setPortalColor(normalized);
    }
  }

  function handleHexInputBlur() {
    const normalized = normalizeHex(hexInput);
    if (!normalized) {
      setHexInput(portalColor);
      return;
    }
    setPortalColor(normalized);
    setHexInput(normalized);
  }

  async function persistName() {
    const parsed = profileNameSchema.safeParse(name);
    if (!parsed.success) {
      showNameFeedback({
        kind: "error",
        message: parsed.error.issues[0]?.message ?? "Please enter your name.",
      });
      return;
    }

    setIsSavingName(true);
    try {
      await updateProfile({
        name: parsed.data,
      });
      setName(parsed.data);
      showNameFeedback(SAVED_FEEDBACK);
    } catch (error) {
      showFriendlyFeedback(showNameFeedback, error, "Could not save your name.");
    } finally {
      setIsSavingName(false);
    }
  }

  async function persistAvatar() {
    if (!pendingAvatarFile) {
      return;
    }

    setIsSavingAvatar(true);
    try {
      const key = await uploadFileToR2({
        generateUploadUrl: r2GenerateUploadUrl,
        syncMetadata: r2SyncMetadata,
        purpose: "profile-avatar",
        file: pendingAvatarFile,
      });
      await updateProfile({ avatarKey: key });
      setPendingAvatarFile(null);
      showAvatarFeedback(SAVED_FEEDBACK);
    } catch (error) {
      showFriendlyFeedback(showAvatarFeedback, error, "Could not save your avatar.");
    } finally {
      setIsSavingAvatar(false);
    }
  }

  async function persistPortalLogo() {
    if (portalLogoDataUrl === null) {
      setIsSavingPortalLogo(true);
      try {
        await updatePortalBranding({ logoUrl: null });
        setPendingLogoFile(null);
        showPortalLogoFeedback(SAVED_FEEDBACK);
      } catch (error) {
        showFriendlyFeedback(showPortalLogoFeedback, error, "Could not save the portal logo.");
      } finally {
        setIsSavingPortalLogo(false);
      }
      return;
    }

    if (!pendingLogoFile) {
      return;
    }

    setIsSavingPortalLogo(true);
    try {
      const key = await uploadFileToR2({
        generateUploadUrl: r2GenerateUploadUrl,
        syncMetadata: r2SyncMetadata,
        purpose: "portal-logo",
        file: pendingLogoFile,
      });
      await updatePortalBranding({ logoKey: key });
      setPendingLogoFile(null);
      showPortalLogoFeedback(SAVED_FEEDBACK);
    } catch (error) {
      showFriendlyFeedback(showPortalLogoFeedback, error, "Could not save the portal logo.");
    } finally {
      setIsSavingPortalLogo(false);
    }
  }

  async function persistPortalColor() {
    setIsSavingPortalColor(true);
    try {
      await updatePortalBranding({
        accentColor: portalColor,
      });
      showPortalColorFeedback(SAVED_FEEDBACK);
    } catch (error) {
      showFriendlyFeedback(showPortalColorFeedback, error, "Could not save the portal color.");
    } finally {
      setIsSavingPortalColor(false);
    }
  }

  function handlePreviewPortalClick(e: MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    const previewUrl = rebaseUrlToCurrentOrigin(
      settingsData?.previewPortalUrl ?? PREVIEW_PORTAL_URL,
    );
    window.open(previewUrl, "_blank", "noopener,noreferrer");
  }

  function handleOpenBillingTab() {
    setActiveTab("billing");

    const url = new URL(window.location.href);
    url.searchParams.set("tab", "billing");
    window.history.pushState({}, "", url.toString());
  }

  async function handleStartCheckout(billingCycle: BillingCycle) {
    setIsCheckoutLoading(true);
    try {
      const result = await createCheckoutSession({ billingCycle });
      if (!result.url) {
        throw new Error("Stripe checkout URL is missing.");
      }
      window.location.assign(result.url);
    } catch (error) {
      showFriendlyFeedback(
        showBillingFeedback,
        error,
        "Could not start checkout right now. Please try again.",
      );
    } finally {
      setIsCheckoutLoading(false);
    }
  }

  async function handleOpenPortal() {
    setIsPortalLoading(true);
    try {
      const result = await createCustomerPortalSession({});
      if (!result.url) {
        throw new Error("Stripe portal URL is missing.");
      }
      window.location.assign(result.url);
    } catch (error) {
      showFriendlyFeedback(
        showBillingFeedback,
        error,
        "Could not open the billing portal right now.",
      );
    } finally {
      setIsPortalLoading(false);
    }
  }

  async function handleStripeConnect() {
    setIsStripeConnecting(true);
    try {
      const result = await startStripeConnect({});
      if (!result.url) {
        throw new Error("Stripe Connect URL is missing.");
      }
      window.location.assign(result.url);
    } catch (error) {
      showFriendlyFeedback(
        showStripeFeedback,
        error,
        "Could not start Stripe Connect right now.",
      );
      setIsStripeConnecting(false);
    }
  }

  async function handleStripeSync() {
    setIsStripeSyncing(true);
    try {
      await syncStripeData({});
      showStripeFeedback(SAVED_FEEDBACK);
    } catch (error) {
      showFriendlyFeedback(showStripeFeedback, error, "Could not sync Stripe data.");
    } finally {
      setIsStripeSyncing(false);
    }
  }

  async function handleStripeDisconnect() {
    setIsStripeDisconnecting(true);
    try {
      await disconnectStripe({});
      showStripeFeedback(SAVED_FEEDBACK);
    } catch (error) {
      showFriendlyFeedback(showStripeFeedback, error, "Could not disconnect Stripe.");
    } finally {
      setIsStripeDisconnecting(false);
    }
  }

  async function handleGoogleSheetConnect() {
    const parsed = googleSheetsUrlSchema.safeParse(googleSheetUrl);
    if (!parsed.success) {
      showGoogleSheetFeedback({
        kind: "error",
        message:
          parsed.error.issues[0]?.message ?? "Please paste a valid Google Sheets document URL.",
      });
      return;
    }

    const normalizedUrl = parsed.data;
    if (!hasGoogleSheetGid(normalizedUrl)) {
      const message = GOOGLE_SHEETS_TRANSACTIONS_DIALOG_MESSAGE;
      showGoogleSheetFeedback({
        kind: "error",
        message: "Please paste the full URL from the Transactions tab, not Share -> Copy link.",
      });
      openGoogleSheetHelpDialog(GOOGLE_SHEETS_TRANSACTIONS_DIALOG_TITLE, message);
      return;
    }

    setIsGoogleSheetConnecting(true);
    try {
      await connectSheet({
        sheetUrl: normalizedUrl,
        templateVersion: "v1",
      });
      setGoogleSheetUrl(normalizedUrl);
      showGoogleSheetFeedback(SAVED_FEEDBACK);
    } catch (error) {
      showFriendlyFeedback(
        showGoogleSheetFeedback,
        error,
        "Could not connect that Google Sheet.",
      );
    } finally {
      setIsGoogleSheetConnecting(false);
    }
  }

  async function handleGoogleSheetImport() {
    setIsGoogleSheetImporting(true);
    try {
      await runSheetImport({
        sourceType: "google_sheet",
      });
      showGoogleSheetFeedback(SAVED_FEEDBACK);
    } catch (error) {
      if (shouldShowTransactionsTabDialog(error)) {
        openGoogleSheetHelpDialog(
          GOOGLE_SHEETS_TRANSACTIONS_DIALOG_TITLE,
          GOOGLE_SHEETS_TRANSACTIONS_DIALOG_MESSAGE,
        );
      }
      showFriendlyFeedback(
        showGoogleSheetFeedback,
        error,
        "Could not import Google Sheets right now.",
      );
    } finally {
      setIsGoogleSheetImporting(false);
    }
  }

  async function handleGoogleSheetDisconnect() {
    setIsGoogleSheetDisconnecting(true);
    try {
      await disconnectSheet({
        sourceType: "google_sheet",
      });
      showGoogleSheetFeedback(SAVED_FEEDBACK);
      setGoogleSheetUrl("");
    } catch (error) {
      showFriendlyFeedback(
        showGoogleSheetFeedback,
        error,
        "Could not disconnect Google Sheets.",
      );
    } finally {
      setIsGoogleSheetDisconnecting(false);
    }
  }

  async function handleDeleteAccount(confirmation: string) {
    setIsDeletingAccount(true);
    try {
      await deleteAccount({
        confirmation,
      });
      showDeleteAccountFeedback(SAVED_FEEDBACK);

      try {
        await signOut();
      } catch {
        // The account deletion removes active auth sessions first, so sign-out can fail safely.
      }

      window.location.assign("/auth");
      return true;
    } catch (error) {
      showFriendlyFeedback(
        showDeleteAccountFeedback,
        error,
        "Could not delete your account right now.",
      );
      return false;
    } finally {
      setIsDeletingAccount(false);
    }
  }

  const subscription = settingsData?.subscription ?? null;
  const previewPortalUrl = settingsData?.previewPortalUrl ?? PREVIEW_PORTAL_URL;
  const planName = subscription ? `Stage ${capitalize(subscription.plan)}` : "Stage Pro";
  const planStatus = subscription ? capitalize(subscription.status) : "Pending";
  const planCycle = subscription
    ? `${capitalize(subscription.billingCycle)} · ${PRO_PRICING[subscription.billingCycle].price}${PRO_PRICING[subscription.billingCycle].period}`
    : "Provider not configured yet";
  const paymentText =
    subscription?.paymentMethodBrand && subscription.paymentMethodLast4
      ? `${capitalize(subscription.paymentMethodBrand)} ending in ${subscription.paymentMethodLast4}`
      : "No payment method on file";
  const paymentProviderText = subscription?.provider
    ? `Powered by ${capitalize(subscription.provider)}`
    : "Billing provider not configured";
  const hasActiveSubscription = Boolean(subscription);
  const isPro = settingsData?.profile.plan === "pro";

  return (
    <>
      <Helmet>
        <title>Settings — Stage</title>
      </Helmet>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="settings-page"
      >
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
              name={name}
              avatarDataUrl={avatarDataUrl}
              avatarInitial={avatarInitial}
              avatarInputRef={avatarInputRef}
              isSavingName={isSavingName}
              isSavingAvatar={isSavingAvatar}
              isDeletingAccount={isDeletingAccount}
              nameFeedback={nameFeedback}
              avatarFeedback={avatarFeedback}
              deleteAccountFeedback={deleteAccountFeedback}
              onNameChange={setName}
              onAvatarInputChange={handleAvatarInputChange}
              onSaveName={() => void persistName()}
              onSaveAvatar={() => void persistAvatar()}
              onDeleteAccount={handleDeleteAccount}
            />

            <BillingTab
              active={activeTab === "billing"}
              planName={planName}
              planStatus={planStatus}
              planCycle={planCycle}
              paymentText={paymentText}
              paymentProviderText={paymentProviderText}
              billingFeedback={billingFeedback}
              isCheckoutLoading={isCheckoutLoading}
              isPortalLoading={isPortalLoading}
              hasActiveSubscription={hasActiveSubscription}
              onOpenUpgradePricing={() => setUpgradePricingOpen(true)}
              onOpenPortal={() => void handleOpenPortal()}
            />

            <IntegrationsTab
              active={activeTab === "integrations"}
              stripeConnection={stripeConnection ?? null}
              stripeFeedback={stripeFeedback}
              isStripeConnecting={isStripeConnecting}
              isStripeSyncing={isStripeSyncing}
              isStripeDisconnecting={isStripeDisconnecting}
              onStripeConnect={() => void handleStripeConnect()}
              onStripeSync={() => void handleStripeSync()}
              onStripeDisconnect={() => void handleStripeDisconnect()}
              stripeGuideHref={null}
              googleSheetsGuideHref={GOOGLE_SHEETS_GUIDE_HREF}
              googleSheetUrl={googleSheetUrl}
              googleSheetConnection={sheetConnections?.googleSheet ?? null}
              googleSheetFeedback={googleSheetFeedback}
              isGoogleSheetConnecting={isGoogleSheetConnecting}
              isGoogleSheetImporting={isGoogleSheetImporting}
              isGoogleSheetDisconnecting={isGoogleSheetDisconnecting}
              onGoogleSheetUrlChange={setGoogleSheetUrl}
              onGoogleSheetConnect={() => void handleGoogleSheetConnect()}
              onGoogleSheetImport={() => void handleGoogleSheetImport()}
              onGoogleSheetDisconnect={() => void handleGoogleSheetDisconnect()}
              googleSheetHelpDialogOpen={googleSheetHelpDialogOpen}
              googleSheetHelpDialogTitle={googleSheetHelpDialogTitle}
              googleSheetHelpDialogMessage={googleSheetHelpDialogMessage}
              onGoogleSheetHelpDialogOpenChange={setGoogleSheetHelpDialogOpen}
            />

            <PortalTab
              active={activeTab === "portal"}
              isPro={isPro}
              previewPortalUrl={previewPortalUrl}
              portalLogoDataUrl={portalLogoDataUrl}
              portalColor={portalColor}
              hexInput={hexInput}
              logoDragActive={logoDragActive}
              logoInputRef={logoInputRef}
              isSavingPortalLogo={isSavingPortalLogo}
              isSavingPortalColor={isSavingPortalColor}
              portalLogoFeedback={portalLogoFeedback}
              portalColorFeedback={portalColorFeedback}
              onPreviewPortalClick={handlePreviewPortalClick}
              onLogoInputChange={handleLogoInputChange}
              onLogoDrop={handleLogoDrop}
              onLogoDragOver={(event) => {
                event.preventDefault();
                setLogoDragActive(true);
              }}
              onLogoDragLeave={() => setLogoDragActive(false)}
              onLogoRemove={() => setPortalLogoDataUrl(null)}
              onPortalColorInput={handlePortalColorInput}
              onHexInputChange={handleHexInputChange}
              onHexInputBlur={handleHexInputBlur}
              onUpgradeClick={handleOpenBillingTab}
              onSavePortalLogo={() => void persistPortalLogo()}
              onSavePortalColor={() => void persistPortalColor()}
            />
          </div>
        </div>
      </motion.div>

      <UpgradePricingModal
        open={upgradePricingOpen}
        onClose={() => {
          if (isCheckoutLoading) {
            return;
          }
          setUpgradePricingOpen(false);
        }}
        onUpgrade={(billingCycle) => {
          void handleStartCheckout(billingCycle);
        }}
        isLoading={isCheckoutLoading}
        errorMessage={billingFeedback.kind === "error" ? billingFeedback.message : null}
      />
    </>
  );
}
