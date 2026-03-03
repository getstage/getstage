import {
  useCallback,
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
import { ArrowSquareOut } from "@phosphor-icons/react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/convex";
import "@/styles/settings.css";

type SettingsTab = "general" | "billing" | "portal";
type SaveFeedback = { kind: "idle" } | { kind: "saved" } | { kind: "error"; message: string };
const IDLE_FEEDBACK: SaveFeedback = { kind: "idle" };
const SAVED_FEEDBACK: SaveFeedback = { kind: "saved" };

const DEFAULT_PORTAL_COLOR = "#E8734A";
const PREVIEW_PORTAL_URL = "/portal/share_acme_2026?preview=1";

export function SettingsPage() {
  const { user } = useAuth();
  const userEmail = user?.email ?? "werner@stage.com";
  const settingsData = useConvexQuery(api.settings.getOverview, { email: userEmail });
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
  const [nameFeedback, setNameFeedback] = useState<SaveFeedback>(IDLE_FEEDBACK);
  const [avatarFeedback, setAvatarFeedback] = useState<SaveFeedback>(IDLE_FEEDBACK);
  const [portalLogoFeedback, setPortalLogoFeedback] = useState<SaveFeedback>(IDLE_FEEDBACK);
  const [portalColorFeedback, setPortalColorFeedback] = useState<SaveFeedback>(IDLE_FEEDBACK);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const feedbackTimerRef = useRef<number | undefined>(undefined);

  const showFeedback = useCallback(
    (setter: (fb: SaveFeedback) => void, feedback: SaveFeedback) => {
      setter(feedback);
      if (feedback.kind !== "idle") {
        if (feedbackTimerRef.current !== undefined) {
          window.clearTimeout(feedbackTimerRef.current);
        }
        feedbackTimerRef.current = window.setTimeout(() => {
          setter(IDLE_FEEDBACK);
        }, 2500);
      }
    },
    [],
  );

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current !== undefined) {
        window.clearTimeout(feedbackTimerRef.current);
      }
    };
  }, []);

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
    readFileAsDataUrl(file, setAvatarDataUrl);
  }

  function handleLogoInputChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    readFileAsDataUrl(file, setPortalLogoDataUrl);
  }

  function handleLogoDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setLogoDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    readFileAsDataUrl(file, setPortalLogoDataUrl);
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
        email: userEmail,
        name,
      });
      showFeedback(setNameFeedback, SAVED_FEEDBACK);
    } catch (error) {
      showFeedback(setNameFeedback, {
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
        email: userEmail,
        avatarUrl: avatarDataUrl,
      });
      showFeedback(setAvatarFeedback, SAVED_FEEDBACK);
    } catch (error) {
      showFeedback(setAvatarFeedback, {
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
        email: userEmail,
        logoUrl: portalLogoDataUrl,
      });
      showFeedback(setPortalLogoFeedback, SAVED_FEEDBACK);
    } catch (error) {
      showFeedback(setPortalLogoFeedback, {
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
        email: userEmail,
        accentColor: portalColor,
      });
      showFeedback(setPortalColorFeedback, SAVED_FEEDBACK);
    } catch (error) {
      showFeedback(setPortalColorFeedback, {
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
            <div className={`tab-content ${activeTab === "general" ? "active" : ""}`}>
              <div className="settings-card">
                <div className="card-body">
                  <div className="card-heading sf">Full name</div>
                  <div className="card-desc">
                    This is your name as it will be displayed on the platform.
                  </div>
                  <label className="settings-label">Name</label>
                  <input
                    className="settings-input"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="card-footer">
                  <FeedbackText feedback={nameFeedback} />
                  <button
                    type="button"
                    className="btn-save"
                    onClick={() => void persistName()}
                    disabled={isSavingName}
                  >
                    Save
                  </button>
                </div>
              </div>

              <div className="settings-card">
                <div className="card-body">
                  <div className="card-heading sf">Avatar</div>
                  <div className="card-desc">This is what you will look like on the platform.</div>
                  <div className="avatar-row">
                    <div className="avatar-circle">
                      {avatarDataUrl ? <img src={avatarDataUrl} alt="Avatar preview" /> : avatarInitial}
                    </div>
                    <button
                      type="button"
                      className="avatar-browse"
                      onClick={() => avatarInputRef.current?.click()}
                    >
                      Browse
                    </button>
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarInputChange}
                      className="hidden-file-input"
                    />
                  </div>
                </div>
                <div className="card-footer">
                  <FeedbackText feedback={avatarFeedback} fallback="Square image recommended" />
                  <button
                    type="button"
                    className="btn-save"
                    onClick={() => void persistAvatar()}
                    disabled={isSavingAvatar || !avatarDataUrl}
                  >
                    Save
                  </button>
                </div>
              </div>

              <div className="settings-card">
                <div className="card-body">
                  <div className="card-heading sf">Delete account</div>
                  <div className="card-desc">
                    Permanently delete your account and all associated projects. This action is
                    immediate and cannot be undone.
                  </div>
                </div>
                <div className="card-footer">
                  <span className="card-footer-text">Coming soon</span>
                  <button
                    type="button"
                    className="btn-delete"
                    disabled
                    title="Account deletion is not available yet"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>

            <div className={`tab-content ${activeTab === "billing" ? "active" : ""}`}>
              <div className="settings-card">
                <div className="card-body">
                  <div className="card-heading sf">Current plan</div>
                  <div className="card-desc">Your active subscription and billing details.</div>
                  <div className="plan-row">
                    <span className="plan-name sf">{planName}</span>
                    <span className="plan-badge">{planStatus}</span>
                  </div>
                  <div className="plan-cycle">{planCycle}</div>
                </div>
                <div className="card-footer">
                  <span className="card-footer-text">Coming soon</span>
                  <button
                    type="button"
                    className="btn-outline"
                    disabled
                    title="Plan changes are not available yet"
                  >
                    Change plan
                  </button>
                </div>
              </div>

              <div className="settings-card">
                <div className="card-body">
                  <div className="card-heading sf">Payment method</div>
                  <div className="card-desc">Your card on file for subscription payments.</div>
                  <div className="payment-row">
                    <div className="visa-icon">VISA</div>
                    <span className="payment-text">{paymentText}</span>
                  </div>
                </div>
                <div className="card-footer">
                  <span className="card-footer-text">{paymentProviderText}</span>
                  <button
                    type="button"
                    className="btn-outline"
                    disabled
                    title="Payment method updates are not available yet"
                  >
                    Update
                  </button>
                </div>
              </div>

              <div className="settings-card">
                <div className="card-body">
                  <div className="card-heading sf">Stripe integration</div>
                  <div className="card-desc">
                    Connect your Stripe account to track client payments directly in Stage.
                  </div>
                  <div className="stripe-connected">
                    <span className="stripe-dot" />
                    {connectionLabel}
                    <button
                      type="button"
                      className="stripe-disconnect"
                      disabled
                      title="Payment account linking is not available yet"
                    >
                      {connectionActionLabel}
                    </button>
                  </div>
                </div>
                <div className="card-footer">
                  <span className="card-footer-text">Payments will appear on your dashboard</span>
                  <span />
                </div>
              </div>
            </div>

            <div className={`tab-content ${activeTab === "portal" ? "active" : ""}`}>
              <div className="portal-header">
                <div />
                <a
                  className="portal-preview-link"
                  href={previewPortalUrl}
                  onClick={handlePreviewPortalClick}
                >
                  Preview portal
                  <ArrowSquareOut size={14} />
                </a>
              </div>

              <div className="settings-card">
                <div className="card-body">
                  <div className="card-heading sf">Logo</div>
                  <div className="card-desc">
                    Upload your logo to display on the client portal. PNG or SVG recommended.
                  </div>
                  <div
                    className={`logo-upload-area ${portalLogoDataUrl ? "has-logo" : ""} ${logoDragActive ? "drag-active" : ""
                      }`}
                    onClick={() => {
                      if (!portalLogoDataUrl) {
                        logoInputRef.current?.click();
                      }
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setLogoDragActive(true);
                    }}
                    onDragLeave={() => setLogoDragActive(false)}
                    onDrop={handleLogoDrop}
                  >
                    {portalLogoDataUrl ? (
                      <div className="logo-preview">
                        <img src={portalLogoDataUrl} alt="Portal logo preview" />
                        <button
                          type="button"
                          className="logo-remove"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPortalLogoDataUrl(null);
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <>
                        <svg
                          className="logo-upload-icon"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="17 8 12 3 7 8" />
                          <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                        <div className="logo-upload-text">
                          Drag &amp; drop or <span>browse</span>
                        </div>
                      </>
                    )}
                  </div>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoInputChange}
                    className="hidden-file-input"
                  />
                </div>
                <div className="card-footer">
                  <FeedbackText feedback={portalLogoFeedback} fallback="Max 2 MB · PNG, SVG, or JPG" />
                  <button
                    type="button"
                    className="btn-save"
                    onClick={() => void persistPortalLogo()}
                    disabled={isSavingPortalLogo}
                  >
                    Save
                  </button>
                </div>
              </div>

              <div className="settings-card">
                <div className="card-body">
                  <div className="card-heading sf">Brand color</div>
                  <div className="card-desc">
                    Choose a primary color for buttons, links, and accents on your client portal.
                  </div>
                  <div className="color-picker-row">
                    <div className="color-swatch" style={{ background: portalColor }}>
                      <input
                        type="color"
                        value={portalColor}
                        onChange={(e) => handlePortalColorInput(e.target.value)}
                      />
                    </div>
                    <input
                      className="hex-input"
                      type="text"
                      value={hexInput}
                      maxLength={7}
                      onChange={handleHexInputChange}
                      onBlur={handleHexInputBlur}
                    />
                  </div>
                  <div className="brand-preview-label">Preview</div>
                  <div className="brand-preview-strip">
                    <div className="brand-preview-progress">
                      <div
                        className="brand-preview-progress-fill"
                        style={{ background: portalColor }}
                      />
                    </div>
                    <div className="brand-preview-check-row">
                      <div className="brand-preview-check" style={{ background: portalColor }}>
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                      <span className="brand-preview-check-label">Project milestone completed</span>
                    </div>
                    <a className="brand-preview-link" style={{ color: portalColor }}>
                      View deliverables →
                    </a>
                  </div>
                </div>
                <div className="card-footer">
                  <FeedbackText feedback={portalColorFeedback} fallback="Applied to buttons, links, and progress indicators" />
                  <button
                    type="button"
                    className="btn-save"
                    onClick={() => void persistPortalColor()}
                    disabled={isSavingPortalColor}
                  >
                    Save
                  </button>
                </div>
              </div>

              <div className="settings-card locked">
                <div className="card-body">
                  <div className="card-heading-row">
                    <div className="card-heading sf domain-heading">Custom domain</div>
                    <span className="pro-badge">PRO</span>
                    <span className="coming-soon-badge">Coming soon</span>
                  </div>
                  <div className="card-desc">
                    Use your own domain for the client portal (e.g. portal.yourstudio.com).
                  </div>
                  <label className="settings-label">Domain</label>
                  <input
                    className="settings-input disabled"
                    type="text"
                    value="portal.yourstudio.com"
                    disabled
                  />
                </div>
                <div className="card-footer">
                  <span className="card-footer-text">Coming soon · requires DNS configuration</span>
                  <button
                    type="button"
                    className="btn-save"
                    disabled
                    title="Custom domains are not available yet"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}

function GeneralIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function BillingIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  );
}

function PortalIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  );
}

function FeedbackText({
  feedback,
  fallback,
}: {
  feedback: SaveFeedback;
  fallback?: string;
}) {
  if (feedback.kind === "saved") {
    return <span className="card-footer-text success">Saved successfully</span>;
  }
  if (feedback.kind === "error") {
    return <span className="card-footer-text" style={{ color: "var(--color-destructive, #E07070)" }}>{feedback.message}</span>;
  }
  if (fallback) {
    return <span className="card-footer-text">{fallback}</span>;
  }
  return <span className="card-footer-text" />;
}

function readFileAsDataUrl(file: File, onDone: (dataUrl: string) => void) {
  const reader = new FileReader();
  reader.onload = () => {
    if (typeof reader.result === "string") {
      onDone(reader.result);
    }
  };
  reader.readAsDataURL(file);
}

function normalizeHex(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  if (!/^#[0-9A-Fa-f]{6}$/.test(withHash)) {
    return null;
  }
  return withHash.toUpperCase();
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatPlanPrice(plan: "free" | "pro") {
  return plan === "pro" ? "Yearly plan" : "Free plan";
}
