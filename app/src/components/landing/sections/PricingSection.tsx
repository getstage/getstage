import { ArrowRight, Check } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { INTEGRATION_ICONS, PRICING_FEATURES } from "./data";

export function PricingSection() {
  return (
    <section className="landing-pricing-grid-section" id="pricing">
      <div className="landing-pricing-lattice">
        <div className="landing-pricing-lattice-row landing-pricing-lattice-row-top" aria-hidden="true">
          {Array.from({ length: 9 }).map((_, index) => (
            <div key={index} className="landing-pricing-lattice-cell" />
          ))}
        </div>

        <div className="landing-pricing-lattice-row landing-pricing-lattice-row-heading">
          <div className="landing-pricing-lattice-cell" aria-hidden="true" />
          <div className="landing-pricing-heading">
            <h2 className="landing-section-title">One yearly plan. Full Stage.</h2>
            <p className="landing-section-subtitle">
              No confusing tiers or hidden add-ons. Every Pro account includes the complete Stage
              workflow.
            </p>
          </div>
          <div className="landing-pricing-lattice-cell" aria-hidden="true" />
        </div>

        <div className="landing-pricing-lattice-row landing-pricing-lattice-row-content">
          <div className="landing-pricing-lattice-cell" aria-hidden="true" />

          <article className="landing-pricing-grid-cell">
            <div className="landing-pricing-plan-head">
              <div className="landing-pricing-plan-row">
                <h3 className="landing-feature-cell-title landing-pricing-plan-title">Professional</h3>
                <span className="landing-pricing-plan-tag">Most Popular</span>
              </div>
              <p className="landing-feature-cell-desc landing-pricing-plan-description">
                Full Stage workflow for freelancers and studios, with all features and integrations.
              </p>
            </div>

            <div className="landing-pricing-price-block">
              <div className="landing-pricing-price-line">
                <span className="landing-pricing-price-amount">$9</span>
              </div>
              <p className="landing-pricing-price-period">Per month</p>
              <p className="landing-pricing-price-note">
                Yearly billing. Charged once as $108/year.
              </p>
            </div>

            <ul className="landing-pricing-feature-list">
              {PRICING_FEATURES.map((feature) => {
                const isIntegrations = feature.key === "integrations";

                return (
                  <li key={feature.key} className="landing-pricing-feature-item">
                    <span className="landing-pricing-feature-icon" aria-hidden="true">
                      <Check size={15} weight="bold" />
                    </span>
                    <span className="landing-pricing-feature-text">{feature.label}</span>
                    {isIntegrations ? (
                      <span className="landing-pricing-inline-integrations">
                        {INTEGRATION_ICONS.map((icon) => (
                          <span
                            key={`pricing-integration-${icon.name}`}
                            className="landing-pricing-inline-integration-logo"
                            title={icon.name}
                          >
                            <img src={icon.src} alt={icon.name} loading="lazy" />
                          </span>
                        ))}
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ul>

            <Link to="/auth" className="landing-btn landing-btn-cta landing-pricing-grid-cta">
              Start 7-day free trial
              <ArrowRight size={16} weight="bold" />
            </Link>
          </article>

          <div className="landing-pricing-lattice-cell" aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}
