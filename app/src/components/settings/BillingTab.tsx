type BillingTabProps = {
  active: boolean;
  planName: string;
  planStatus: string;
  planCycle: string;
  paymentText: string;
  paymentProviderText: string;
  connectionLabel: string;
  connectionActionLabel: string;
};

export function BillingTab({
  active,
  planName,
  planStatus,
  planCycle,
  paymentText,
  paymentProviderText,
  connectionLabel,
  connectionActionLabel,
}: BillingTabProps) {
  return (
    <div className={`tab-content ${active ? "active" : ""}`}>
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
  );
}
