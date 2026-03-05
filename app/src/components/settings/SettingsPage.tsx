import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type MouseEvent,
} from "react";
import { useMutation as useConvexMutation, useQuery as useConvexQuery } from "convex/react";
import { Helmet } from "react-helmet-async";
import { motion } from "motion/react";
import { BillingTab } from "@/components/settings/BillingTab";
import { GeneralTab } from "@/components/settings/GeneralTab";
import { BillingIcon, GeneralIcon, PortalIcon } from "@/components/settings/SettingsIcons";
import { PortalTab } from "@/components/settings/PortalTab";
import type { SettingsTab } from "@/components/settings/settingsTypes";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/convex";
import { DEFAULT_PORTAL_COLOR } from "@/lib/constants";
import { capitalize, formatPlanPrice, normalizeHex } from "@/lib/format";
import { SAVED_FEEDBACK, useFeedback } from "@/hooks/useFeedback";
import { readFileAsDataUrl } from "@/lib/utils";
import "@/styles/settings.css";

const PREVIEW_PORTAL_URL = "/portal/share_acme_2026?preview=1";

export function SettingsPage() {
  const { user } = useAuth();
  const settingsData = useConvexQuery(
    api.settings.getOverview,
    !user ? "skip" : {},
  );
  const updateProfile = useConvexMutation(api.settings.updateProfile);
  const updatePortalBranding = useConvexMutation(api.settings.updatePortalBranding);
  const [name, setName] = useState(user?.name ?? "");
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(user?.avatarUrl ?? null);
  const [portalLogoDataUrl, setPortalLogoDataUrl] = useState<string | null>(null);
  const [portalColor, setPortalColor] = useState(DEFAULT_PORTAL_COLOR);
  const [hexInput, setHexInput] = useState(DEFAULT_PORTAL_COLOR);
  const [logoDragActive, setLogoDragActive] = useState(false);
  const [isSavingName, setIsSavingName] = useState(false);
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);
  const [isSavingPortalLogo, setIsSavingPortalLogo] = useState(false);
  const [isSavingPortalColor, setIsSavingPortalColor] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const { feedback: nameFeedback, showFeedback: showNameFeedback } = useFeedback();
  const { feedback: avatarFeedback, showFeedback: showAvatarFeedback } = useFeedback();
  const { feedback: portalLogoFeedback, showFeedback: showPortalLogoFeedback } = useFeedback();
  const { feedback: portalColorFeedback, showFeedback: showPortalColorFeedback } = useFeedback();

  useEffect(() => {
    const applyTabFromUrl = () => {
      const tabParam = new URLSearchParams(window.location.search).get("tab");
      if (tabParam === "billing" || tabParam === "portal") {
        setActiveTab(tabParam);
      } else {
        setActiveTab("general");
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

  const avatarInitial = name.trim().charAt(0).toUpperCase() || "S";

  function handleAvatarInputChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    void readFileAsDataUrl(file).then(setAvatarDataUrl);
  }

  function handleLogoInputChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    void readFileAsDataUrl(file).then(setPortalLogoDataUrl);
  }

  function handleLogoDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setLogoDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    void readFileAsDataUrl(file).then(setPortalLogoDataUrl);
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
    setIsSavingName(true);
    try {
      await updateProfile({
        name,
      });
      showNameFeedback(SAVED_FEEDBACK);
    } catch (error) {
      showNameFeedback({
        kind: "error",
        message: error instanceof Error ? error.message : "Could not save name.",
      });
    } finally {
      setIsSavingName(false);
    }
  }

  async function persistAvatar() {
    if (!avatarDataUrl) {
      return;
    }

    setIsSavingAvatar(true);
    try {
      await updateProfile({
        avatarUrl: avatarDataUrl,
      });
      showAvatarFeedback(SAVED_FEEDBACK);
    } catch (error) {
      showAvatarFeedback({
        kind: "error",
        message: error instanceof Error ? error.message : "Could not save avatar.",
      });
    } finally {
      setIsSavingAvatar(false);
    }
  }

  async function persistPortalLogo() {
    setIsSavingPortalLogo(true);
    try {
      await updatePortalBranding({
        logoUrl: portalLogoDataUrl,
      });
      showPortalLogoFeedback(SAVED_FEEDBACK);
    } catch (error) {
      showPortalLogoFeedback({
        kind: "error",
        message: error instanceof Error ? error.message : "Could not save portal logo.",
      });
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
      showPortalColorFeedback({
        kind: "error",
        message: error instanceof Error ? error.message : "Could not save portal color.",
      });
    } finally {
      setIsSavingPortalColor(false);
    }
  }

  function handlePreviewPortalClick(e: MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    const previewUrl = settingsData?.previewPortalUrl ?? PREVIEW_PORTAL_URL;
    window.open(previewUrl, "_blank", "noopener,noreferrer");
  }

  const subscription = settingsData?.subscription ?? null;
  const paymentConnection = settingsData?.paymentConnection ?? null;
  const previewPortalUrl = settingsData?.previewPortalUrl ?? PREVIEW_PORTAL_URL;
  const planName = subscription ? `Stage ${capitalize(subscription.plan)}` : "Stage Pro";
  const planStatus = subscription ? capitalize(subscription.status) : "Pending";
  const planCycle = subscription
    ? `${capitalize(subscription.billingCycle)} · ${formatPlanPrice(subscription.plan)}`
    : "Provider not configured yet";
  const paymentText =
    subscription?.paymentMethodBrand && subscription.paymentMethodLast4
      ? `${capitalize(subscription.paymentMethodBrand)} ending in ${subscription.paymentMethodLast4}`
      : "No payment method on file";
  const paymentProviderText = subscription?.provider
    ? `Powered by ${capitalize(subscription.provider)}`
    : "Billing provider not configured";
  const connectionLabel = paymentConnection?.provider
    ? `Connected to ${capitalize(paymentConnection.provider)}`
    : "No payment provider connected";
  const connectionActionLabel =
    paymentConnection?.status === "active" ? "Disconnect" : "Connect";

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
              nameFeedback={nameFeedback}
              avatarFeedback={avatarFeedback}
              onNameChange={setName}
              onAvatarInputChange={handleAvatarInputChange}
              onSaveName={() => void persistName()}
              onSaveAvatar={() => void persistAvatar()}
            />

            <BillingTab
              active={activeTab === "billing"}
              planName={planName}
              planStatus={planStatus}
              planCycle={planCycle}
              paymentText={paymentText}
              paymentProviderText={paymentProviderText}
              connectionLabel={connectionLabel}
              connectionActionLabel={connectionActionLabel}
            />

            <PortalTab
              active={activeTab === "portal"}
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
              onSavePortalLogo={() => void persistPortalLogo()}
              onSavePortalColor={() => void persistPortalColor()}
            />
          </div>
        </div>
      </motion.div>
    </>
  );
}
