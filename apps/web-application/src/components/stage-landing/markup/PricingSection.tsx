const plans = [
  {
    name: "Solo",
    description: "Work through your own product before you build it.",
    price: "$29",
    featured: false,
    features: [
      "Includes one seat.",
      "Includes 2,000 AI credits per month.",
      "Export to any coding agent.",
    ],
  },
  {
    name: "Studio",
    description: "Bring your team and clients into the same process.",
    price: "$99",
    featured: true,
    features: [
      "Includes up to five seats.",
      "Includes 10,000 pooled AI credits per month.",
      "Custom client portal with your brand.",
    ],
  },
  {
    name: "Agency",
    description: "Run the product process across a larger team.",
    price: "$249",
    featured: false,
    features: [
      "Includes up to 15 seats.",
      "Includes 30,000 pooled AI credits per month.",
      "Custom client portals with your brand.",
    ],
  },
] as const;

const DEMO_URL = "https://cal.com/adrien-ninet/stage-demo";

export function PricingSection() {
  return (
    <section className="pricing section-shell" id="pricing">
      <div className="pricing-heading">
        <div className="section-label">
          <PriceTagIcon />
          <span>Pricing</span>
        </div>
        <h2 className="section-headline">
          Choose the plan for the people doing the work.
        </h2>
      </div>

      <div className="pricing-grid">
        {plans.map((plan) => (
          <article
            className={`price-card${plan.featured ? " price-card-featured" : ""}`}
            key={plan.name}
          >
            <div className="plan-name">
              <StageMark />
              <h3>{plan.name}</h3>
            </div>
            <p className="plan-positioning">{plan.description}</p>
            <div className="plan-price">
              {plan.price}
              <span>/mo</span>
            </div>
            <ul>
              {plan.features.map((feature) => (
                <li key={feature}>
                  <CheckIcon />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <div className="hero-actions">
              <a
                className="button button-neutral"
                href={DEMO_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                Book a demo
              </a>
              <a
                className={`button ${plan.featured ? "button-primary" : "button-neutral"}`}
                href="/download"
              >
                <AppleIcon />
                <span>Download for Mac</span>
              </a>
            </div>
            <p className="cta-caption pricing-trial">
              Includes 14-day free trial
            </p>
          </article>
        ))}
      </div>

      <div className="enterprise">
        <div>
          <h3>Enterprise</h3>
          <p>15+ seats. Contact us to discuss what your team needs.</p>
        </div>
        <a href={DEMO_URL} target="_blank" rel="noopener noreferrer">
          Contact us <ArrowRightIcon />
        </a>
      </div>
    </section>
  );
}

function StageMark() {
  return (
    <svg
      className="icon"
      aria-hidden="true"
      viewBox="0 0 19 23"
      fill="none"
    >
      <path
        d="M16.36 2.13c.16 1.39-.84 2.54-2.22 2.65-3.75.16-6.9 2.45-8.14 5.74-.24.64-.16 1.42-.69 2.12a2.54 2.54 0 0 1-3.5.2c-.99-.9-.83-2.07-.51-3.23C2.8 4.07 7.76.13 13.98 0a2.44 2.44 0 0 1 2.38 2.13Z"
        fill="currentColor"
      />
      <path
        d="M15.26 11.64c.13 1.94-.86 4.7-2.88 6.7-2.47 2.5-5.72 4.02-9.52 4.28a2.53 2.53 0 0 1-2.84-2.1c-.17-1.4.82-2.65 2.2-2.68 3.23-.23 6.17-2.05 7.85-4.8.4-.65.73-1.5.86-2.18.18-1.35 1.03-2.28 2.38-2.28 1.35 0 2.08 1.02 1.95 3.06Z"
        fill="currentColor"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="icon" aria-hidden="true" viewBox="0 0 16 16" fill="none">
      <path
        d="m3.5 8.25 2.75 2.75 6.25-7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg className="icon" aria-hidden="true" viewBox="0 0 384 512">
      <path
        fill="currentColor"
        d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3Z"
      />
    </svg>
  );
}

function PriceTagIcon() {
  return (
    <svg className="icon" aria-hidden="true" viewBox="0 0 24 24" fill="none">
      <path
        d="M3.5 4.5v6.2a2 2 0 0 0 .59 1.42l8.29 8.29a2 2 0 0 0 2.83 0l5.2-5.2a2 2 0 0 0 0-2.83l-8.29-8.29a2 2 0 0 0-1.42-.59H4.5a1 1 0 0 0-1 1Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="8" cy="8" r="1.25" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg className="icon" aria-hidden="true" viewBox="0 0 16 16" fill="none">
      <path
        d="M2.5 8h10.25m-4-4.25L13 8l-4.25 4.25"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
