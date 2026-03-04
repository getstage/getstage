import type { Icon } from "@phosphor-icons/react";
import {
  ArrowRight,
  ChartLineUp,
  ChartPieSlice,
  CurrencyCircleDollar,
  DownloadSimple,
  Folders,
  Lifebuoy,
  ListChecks,
  PlugsConnected,
  ShareNetwork,
  ShieldCheck,
  Sparkle,
} from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { INTEGRATION_ICONS, PRICING_FEATURES } from "./data";

type PricingFeatureKey = (typeof PRICING_FEATURES)[number]["key"];

const PRICING_FEATURE_ICON_MAP: Record<PricingFeatureKey, Icon> = {
  "unlimited-projects": Folders,
  "ai-roadmaps": Sparkle,
  "timeline-overview": ChartLineUp,
  "phase-management": ListChecks,
  "client-portal": ShareNetwork,
  "stripe-tracking": CurrencyCircleDollar,
  "revenue-insights": ChartPieSlice,
  "privacy-first": ShieldCheck,
  "data-exports": DownloadSimple,
  "priority-support": Lifebuoy,
  integrations: PlugsConnected,
};

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

          <article className="landing-pricing-grid-card is-overview">
            <div className="landing-pricing-grid-card-head">
              <div className="landing-pricing-plan-row">
                <h3 className="landing-feature-cell-title landing-pricing-plan-title">Pro</h3>
                <span className="landing-pricing-plan-tag">Yearly billing</span>
              </div>
              <p className="landing-feature-cell-desc landing-pricing-plan-description">
                Built for freelancers and studios who want clarity across every project.
              </p>
            </div>

            <div className="landing-pricing-price-block">
              <div className="landing-pricing-price-line">
                <span className="landing-pricing-price-amount">$108</span>
                <span className="landing-pricing-price-period">/year</span>
              </div>
              <p className="landing-pricing-price-note">$9/month equivalent, billed once yearly.</p>
            </div>

            <Link to="/auth" className="landing-btn landing-btn-cta landing-pricing-grid-cta">
              Start with Pro
              <ArrowRight size={16} weight="bold" />
            </Link>

            <p className="landing-pricing-renewal-note">
              Cancel or switch to free before renewal. No long-term lock-in.
            </p>
          </article>

          <article className="landing-pricing-grid-card is-features">
            <div className="landing-pricing-grid-card-head">
              <h3 className="landing-feature-cell-title landing-pricing-features-title">
                Everything included
              </h3>
              <p className="landing-feature-cell-desc landing-pricing-features-description">
                Every feature in one plan, with integrations ready from day one.
              </p>
            </div>

            <ul className="landing-pricing-feature-list">
              {PRICING_FEATURES.map((feature) => {
                const FeatureIcon = PRICING_FEATURE_ICON_MAP[feature.key];
                const isIntegrations = feature.key === "integrations";

                return (
                  <li
                    key={feature.key}
                    className={`landing-pricing-feature-item ${isIntegrations ? "is-integrations" : ""}`}
                  >
                    <span className="landing-pricing-feature-icon" aria-hidden="true">
                      <FeatureIcon size={17} weight="duotone" />
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
          </article>

          <div className="landing-pricing-lattice-cell" aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}
