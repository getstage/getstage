import { useState } from "react";
import { Check } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import {
  FREE_FEATURES,
  PRO_FEATURES,
  PRO_PRICING,
  type BillingCycle,
} from "@/components/onboarding/OnboardingPaywall";

export function PricingSection() {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("yearly");
  const pricing = PRO_PRICING[billingCycle];

  return (
    <section className="landing-pricing-grid-section" id="pricing">
      <div className="landing-pricing-lattice">
        <div className="landing-pricing-lattice-row landing-pricing-lattice-row-top" aria-hidden="true">
          <div className="landing-pricing-lattice-cell" />
        </div>

        <div className="landing-pricing-lattice-row landing-pricing-lattice-row-heading">
          <div className="landing-pricing-lattice-cell" aria-hidden="true" />
          <div className="landing-pricing-heading">
            <h2 className="landing-section-title">Simplified pricing</h2>
            <p className="landing-section-subtitle">
              No confusing tiers. One plan for the complete experience, and a generous free tier to
              start.
            </p>
          </div>
          <div className="landing-pricing-lattice-cell" aria-hidden="true" />
        </div>

        <div className="landing-pricing-lattice-row landing-pricing-lattice-row-content">
          <div className="landing-pricing-lattice-cell" aria-hidden="true" />

          <article className="landing-pricing-grid-cell">
            <div className="landing-pricing-billing-wrap">
              <div className="landing-pricing-billing-control" aria-label="Billing cycle">
                <button
                  type="button"
                  className={`landing-pricing-billing-button ${
                    billingCycle === "monthly" ? "is-active" : ""
                  }`}
                  onClick={() => setBillingCycle("monthly")}
                  aria-pressed={billingCycle === "monthly"}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  className={`landing-pricing-billing-button ${
                    billingCycle === "yearly" ? "is-active" : ""
                  }`}
                  onClick={() => setBillingCycle("yearly")}
                  aria-pressed={billingCycle === "yearly"}
                >
                  Yearly
                  <span className="landing-pricing-billing-save">50% off</span>
                </button>
              </div>
            </div>

            <div className="landing-pricing-split">
              <section className="landing-pricing-split-pane landing-pricing-split-pane-free">
                <div className="landing-pricing-plan-head">
                  <div className="landing-pricing-plan-row">
                    <h3 className="landing-feature-cell-title landing-pricing-plan-title">Free</h3>
                  </div>
                  <p className="landing-feature-cell-desc landing-pricing-plan-description">
                    For getting started without friction.
                  </p>
                </div>

                <div className="landing-pricing-price-block">
                  <div className="landing-pricing-price-line">
                    <span className="landing-pricing-price-amount">$0</span>
                  </div>
                  <p className="landing-pricing-price-period">/forever</p>
                  <p className="landing-pricing-price-note">No credit card required.</p>
                </div>

                <ul className="landing-pricing-feature-list is-single-column is-free">
                  {FREE_FEATURES.map((feature) => (
                    <li key={feature} className="landing-pricing-feature-item is-free">
                      <span className="landing-pricing-feature-icon is-free" aria-hidden="true">
                        <Check size={15} weight="bold" />
                      </span>
                      <span className="landing-pricing-feature-text">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  to="/auth"
                  className="landing-btn landing-btn-ghost landing-btn-secondary landing-pricing-grid-cta"
                >
                  Continue free
                </Link>
              </section>

              <section className="landing-pricing-split-pane landing-pricing-split-pane-pro">
                <div className="landing-pricing-plan-head">
                  <div className="landing-pricing-plan-row">
                    <h3 className="landing-feature-cell-title landing-pricing-plan-title">Pro</h3>
                    {billingCycle === "yearly" ? (
                      <span className="landing-hero-badge landing-pricing-plan-tag">
                        <span className="landing-pricing-plan-tag-text">Launch offer</span>
                      </span>
                    ) : null}
                  </div>
                  <p className="landing-feature-cell-desc landing-pricing-plan-description">
                    Everything in Stage, with advanced workflow tools.
                  </p>
                </div>

                <div className="landing-pricing-price-block">
                  <div className="landing-pricing-price-line">
                    {pricing.originalPrice ? (
                      <span className="landing-pricing-price-original">{pricing.originalPrice}</span>
                    ) : null}
                    <span className="landing-pricing-price-amount">{pricing.price}</span>
                  </div>
                  <p className="landing-pricing-price-period">{pricing.period}</p>
                  <p className="landing-pricing-price-note">{pricing.note}</p>
                  <p className="landing-pricing-price-subnote">{pricing.subnote}</p>
                </div>

                <ul className="landing-pricing-feature-list is-single-column">
                  {PRO_FEATURES.map((feature) => (
                    <li key={feature} className="landing-pricing-feature-item">
                      <span className="landing-pricing-feature-icon" aria-hidden="true">
                        <Check size={15} weight="bold" />
                      </span>
                      <span className="landing-pricing-feature-text">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link to="/auth" className="landing-btn landing-btn-cta landing-pricing-grid-cta">
                  {pricing.cta}
                </Link>
              </section>
            </div>
          </article>

          <div className="landing-pricing-lattice-cell" aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}
