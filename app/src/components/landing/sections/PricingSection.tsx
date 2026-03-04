import { Link } from "@tanstack/react-router";
import { PRICING_FEATURES } from "./data";
import { CheckIcon } from "./shared";

export function PricingSection() {
  return (
    <section className="landing-structural-section" id="pricing">
      <div className="landing-section-grid border-t-0">
        <div className="landing-grid-cell col-span-12 md:col-span-5 flex flex-col justify-center">
          <div className="landing-section-label">Pricing</div>
          <h2 className="landing-section-title">One clear yearly plan</h2>
          <p className="landing-section-subtitle mb-0">
            No confusing tiers. Pro includes every core capability you need to run Stage at full
            power.
          </p>
        </div>

        <div className="landing-grid-cell col-span-12 md:col-span-7 no-padding">
          <div className="landing-pricing-cell pro h-full p-10 md:p-14">
            <div className="landing-pricing-cell-layout">
              <div className="landing-pricing-overview">
                <div className="landing-pricing-head">
                  <div className="landing-pricing-plan-name">Pro</div>
                  <span className="landing-pricing-tag">Annual billing</span>
                </div>
                <div className="landing-pricing-price">
                  <span className="landing-pricing-amount">$9</span>
                  <span className="landing-pricing-period">/month</span>
                </div>
                <div className="landing-pricing-billing">
                  Billed annually ($108/year). Cancel before renewal any time.
                </div>
                <Link to="/auth" className="landing-btn landing-btn-cta landing-pricing-cta">
                  Get started
                </Link>
              </div>

              <div className="landing-pricing-details">
                <div className="landing-pricing-details-title">Everything included</div>
                <ul className="landing-pricing-features">
                  {PRICING_FEATURES.map((feature) => (
                    <li key={feature} className="landing-pricing-feature">
                      <CheckIcon />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
