import { ArrowRight, Check } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { PRICING_FEATURES } from "./data";

export function PricingSection() {
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
            <div className="landing-pricing-plan-head">
              <div className="landing-pricing-plan-row">
                <h3 className="landing-feature-cell-title landing-pricing-plan-title">Pro</h3>
                <span className="landing-hero-badge landing-pricing-plan-tag">
                  <span className="landing-pricing-plan-tag-text">Unlock Everything</span>
                </span>
              </div>
            </div>

            <div className="landing-pricing-price-block">
              <div className="landing-pricing-price-line">
                <span className="landing-pricing-price-amount">$9</span>
              </div>
              <p className="landing-pricing-price-period">/month</p>
              <p className="landing-pricing-price-note">Billed annually ($108/year)</p>
            </div>

            <ul className="landing-pricing-feature-list">
              {PRICING_FEATURES.map((feature) => (
                <li key={feature.key} className="landing-pricing-feature-item">
                  <span className="landing-pricing-feature-icon" aria-hidden="true">
                    <Check size={15} weight="bold" />
                  </span>
                  <span className="landing-pricing-feature-text">{feature.label}</span>
                </li>
              ))}
            </ul>

            <Link to="/auth" className="landing-btn landing-btn-cta landing-pricing-grid-cta">
              Get started
              <ArrowRight size={16} weight="bold" />
            </Link>
            <div className="landing-pricing-free">Free tier available — no credit card required</div>
          </article>

          <div className="landing-pricing-lattice-cell" aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}
