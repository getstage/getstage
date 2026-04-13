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
  return (
    <div className={`tab-content ${active ? "active" : ""}`}>
      <div className="settings-card">
        <div className="card-body">
          <div className="card-heading sf">Current plan</div>
          <div className="card-desc">Your Stage subscription, checkout, and customer portal.</div>
          <div className="plan-row">
            <span className="plan-name sf">{planName}</span>
            <span className="plan-badge">{planStatus}</span>
          </div>
          <div className="plan-cycle">{planCycle}</div>
        </div>
        <div className="card-footer">
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
          <div className="flex items-center gap-2">
            {hasActiveSubscription ? (
              <button
                type="button"
                className="btn-outline"
                disabled={isPortalLoading}
                onClick={onOpenPortal}
              >
                {isPortalLoading ? "Opening..." : "Manage billing"}
              </button>
            ) : isPro ? (
              <button
                type="button"
                className="btn-outline"
                disabled
              >
                Pro active
              </button>
            ) : (
              <button
                type="button"
                className="btn-outline"
                disabled={isCheckoutLoading}
                onClick={onOpenUpgradePricing}
              >
                Upgrade
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="settings-card">
        <div className="card-body">
          <div className="card-heading sf">Payment method</div>
          <div className="card-desc">Card details come from your active Stage subscription.</div>
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
            disabled={!hasActiveSubscription || isPortalLoading}
            onClick={onOpenPortal}
          >
            {isPortalLoading ? "Opening..." : "Update"}
          </button>
        </div>
      </div>
    </div>
  );
}
