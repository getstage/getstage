import { FeedbackText } from "@/components/settings/FeedbackText";
import type { SaveFeedback } from "@/hooks/useFeedback";

type BillingTabProps = {
  active: boolean;
  isPro: boolean;
  planName: string;
  planStatus: string;
  planCycle: string;
  paymentText: string;
  paymentProviderText: string;
  billingFeedback: SaveFeedback;
  isCheckoutLoading: boolean;
  isPortalLoading: boolean;
  hasActiveSubscription: boolean;
  onOpenUpgradePricing: () => void;
  onOpenPortal: () => void;
};

export function BillingTab({
  active,
  isPro,
  planName,
  planStatus,
  planCycle,
  paymentText,
  paymentProviderText,
  billingFeedback,
  isCheckoutLoading,
  isPortalLoading,
  hasActiveSubscription,
  onOpenUpgradePricing,
  onOpenPortal,
}: BillingTabProps) {
  const billingCycle = planCycle.split("·")[0]?.trim() || planCycle;
  const renewsOn = hasActiveSubscription ? "24/05/2026" : "Not scheduled";
  const primaryActionLabel = hasActiveSubscription
    ? isPortalLoading
      ? "Opening..."
      : "Manage billing"
    : isCheckoutLoading
      ? "Opening..."
      : "Upgrade to Team Plan";

  return (
    <div className={`tab-content ${active ? "active" : ""}`}>
      <div className="settings-stack">
        <div className="settings-section-card">
          <div className="settings-section-title">Current plan</div>
          <div className="settings-section-description">
            Your Stage subscription, checkout, and customer portal.
          </div>
          <div className="settings-row-card settings-plan-card">
            <div className="settings-plan-copy">
              <span className="settings-muted-label">Your current plan</span>
              <span className="plan-name sf">{planName}</span>
              <span className="plan-badge">{planStatus}</span>
            </div>
            <div className="settings-plan-meta">
              <div>
                <span className="settings-muted-label">Billing Cycle</span>
                <strong>{billingCycle}</strong>
              </div>
              <div>
                <span className="settings-muted-label">Renews on</span>
                <strong>{renewsOn}</strong>
              </div>
            </div>
            <button
              type="button"
              className="btn-primary-gradient settings-plan-action"
              disabled={isCheckoutLoading || isPortalLoading || isPro}
              onClick={hasActiveSubscription ? onOpenPortal : onOpenUpgradePricing}
            >
              {isPro && !hasActiveSubscription ? "Pro active" : primaryActionLabel}
            </button>
          </div>
          <FeedbackText
            feedback={billingFeedback}
            fallback={
              hasActiveSubscription
                ? "Manage your subscription in Stripe Customer Portal"
                : isPro
                  ? "This workspace already has Pro access."
                : "Upgrade to Stage Pro to unlock the live dashboard and API access."
            }
          />
        </div>

        <div className="settings-section-card">
          <div className="settings-section-title">Payment method</div>
          <div className="settings-section-description">
            Card details come from your active Stage subscription.
          </div>
          <div className="settings-row-card settings-payment-row">
            <div className="payment-row">
              <div className="visa-icon">VISA</div>
              <span className="payment-text">{paymentText}</span>
            </div>
            <button
              type="button"
              className="btn-outline"
              disabled={!hasActiveSubscription || isPortalLoading}
              onClick={onOpenPortal}
            >
              {isPortalLoading ? "Opening..." : "Update Payment Method"}
            </button>
          </div>
          <span className="card-footer-text">{paymentProviderText}</span>
        </div>
      </div>
    </div>
  );
}
