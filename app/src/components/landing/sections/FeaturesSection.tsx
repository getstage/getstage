import type { ReactNode } from "react";
import clientPortalImage from "@/assets/landing-images/client-portal.webp";
import paymentTrackingImage from "@/assets/landing-images/payment-tracking.webp";
import phaseManagementImage from "@/assets/landing-images/phase-management.webp";
import timelineOverviewImage from "@/assets/landing-images/timeline-overview.webp";
import privacyIcon from "@/assets/icons/privacy.png";
import { IntegrationsMockup } from "./mockups/IntegrationsMockup";

export function FeaturesSection() {
  return (
    <section className="landing-features-grid-section" id="features">
      <div className="landing-features-lattice">
        <div className="landing-features-lattice-row landing-features-lattice-row-top" aria-hidden="true">
          {Array.from({ length: 9 }).map((_, index) => (
            <div key={index} className="landing-features-lattice-cell" />
          ))}
        </div>

        <div className="landing-features-lattice-row landing-features-lattice-row-heading">
          <div className="landing-features-lattice-cell" aria-hidden="true" />
          <div className="landing-features-heading">
            <h2 className="landing-section-title">
              Everything you need to manage your creative projects
            </h2>
            <p className="landing-section-subtitle">
              From timeline overview to revenue tracking, get the full picture without the clutter.
            </p>
          </div>
          <div className="landing-features-lattice-cell" aria-hidden="true" />
        </div>

        <div className="landing-features-lattice-row landing-features-lattice-row-feature">
          <div className="landing-features-lattice-cell" aria-hidden="true" />
          <FeatureCard
            title="Timeline Overview"
            description="See all your projects mapped across time. The elevation curve shows workload density at a glance."
            image={
              <FeatureImage
                src={timelineOverviewImage}
                alt="Timeline overview in the Stage dashboard"
              />
            }
          />
          <FeatureCard
            title="Client Portal"
            description="Share a live, read-only view with your clients. They see progress without the noise."
            image={<FeatureImage src={clientPortalImage} alt="Client portal view in Stage" />}
          />
          <div className="landing-features-lattice-cell" aria-hidden="true" />
        </div>

        <div className="landing-features-lattice-row landing-features-lattice-row-feature">
          <div className="landing-features-lattice-cell" aria-hidden="true" />
          <FeatureCard
            title="Phase Management"
            description="Break projects into clear phases with tasks. Drag, reorder, check off."
            image={<FeatureImage src={phaseManagementImage} alt="Phase management view in Stage" />}
          />
          <FeatureCard
            title="Payment Tracking"
            description="Connect Stripe and see who's paid and who hasn't, right on your dashboard."
            image={<FeatureImage src={paymentTrackingImage} alt="Payment tracking in the Stage dashboard" />}
          />
          <div className="landing-features-lattice-cell" aria-hidden="true" />
        </div>

        <div className="landing-features-lattice-row landing-features-lattice-row-compact">
          <div className="landing-features-lattice-cell" aria-hidden="true" />
          <FeatureCard
            title="Privacy-first"
            description="Your data stays yours. No selling, no tracking, no ads. GDPR-compliant by default."
            image={<img src={privacyIcon} alt="" className="landing-feature-compact-icon" />}
            compact
            inlineHeadingMedia
          />
          <FeatureCard
            title="Integrations"
            description="Connect with Stripe today. Figma, Notion, and Slack coming soon."
            image={<IntegrationsMockup />}
            compact
            cardClassName="is-integrations"
            inlineHeadingMedia
          />
          <div className="landing-features-lattice-cell" aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}

function FeatureCard({
  title,
  description,
  image,
  compact = false,
  cardClassName,
  inlineHeadingMedia = false,
}: {
  title: string;
  description: string;
  image?: ReactNode;
  compact?: boolean;
  cardClassName?: string;
  inlineHeadingMedia?: boolean;
}) {
  const classes = ["landing-feature-grid-card", compact ? "is-compact" : "", cardClassName ?? ""]
    .filter(Boolean)
    .join(" ");

  return (
    <article className={classes}>
      {image && !inlineHeadingMedia && <div className="landing-feature-grid-card-media">{image}</div>}
      <div className="landing-feature-grid-card-body">
        <div className="landing-feature-grid-card-heading">
          <div className="landing-feature-cell-title">{title}</div>
          {image && inlineHeadingMedia && (
            <div className="landing-feature-grid-card-heading-media">{image}</div>
          )}
        </div>
        <div className="landing-feature-cell-desc">{description}</div>
      </div>
    </article>
  );
}

function FeatureImage({ src, alt }: { src: string; alt: string }) {
  return <img src={src} alt={alt} className="landing-feature-grid-image" loading="lazy" />;
}
