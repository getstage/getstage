import { Lock } from "@phosphor-icons/react";
import { gsap } from "gsap";
import { type ReactNode, useEffect, useRef } from "react";
import clientPortalImage from "@/assets/landing-images/client-portal.webp";
import paymentTrackingImage from "@/assets/landing-images/payment-tracking.webp";
import phaseManagementImage from "@/assets/landing-images/phase-management.webp";
import timelineOverviewImage from "@/assets/landing-images/timeline-overview.webp";
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
                motionSeed={0}
              />
            }
          />
          <FeatureCard
            title="Client Portal"
            description="Share a live, read-only view with your clients. They see progress without the noise."
            image={<FeatureImage src={clientPortalImage} alt="Client portal view in Stage" motionSeed={1} />}
          />
          <div className="landing-features-lattice-cell" aria-hidden="true" />
        </div>

        <div className="landing-features-lattice-row landing-features-lattice-row-feature">
          <div className="landing-features-lattice-cell" aria-hidden="true" />
          <FeatureCard
            title="Phase Management"
            description="Break projects into clear phases with tasks. Drag, reorder, check off."
            image={<FeatureImage src={phaseManagementImage} alt="Phase management view in Stage" motionSeed={2} />}
          />
          <FeatureCard
            title="Payment Tracking"
            description="Connect Stripe and see who's paid and who hasn't, right on your dashboard."
            image={
              <FeatureImage
                src={paymentTrackingImage}
                alt="Payment tracking in the Stage dashboard"
                motionSeed={3}
              />
            }
          />
          <div className="landing-features-lattice-cell" aria-hidden="true" />
        </div>

        <div className="landing-features-lattice-row landing-features-lattice-row-compact">
          <div className="landing-features-lattice-cell" aria-hidden="true" />
          <FeatureCard
            title="Privacy-first"
            description="Your data stays yours. No selling, no tracking, no ads. GDPR-compliant by default."
            image={<Lock weight="duotone" className="landing-feature-compact-icon" aria-hidden="true" />}
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

function FeatureImage({
  src,
  alt,
  motionSeed = 0,
}: {
  src: string;
  alt: string;
  motionSeed?: number;
}) {
  const imageRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const image = imageRef.current;
    if (!image) {
      return;
    }

    const scanPresets = [
      {
        first: { xPercent: 0, yPercent: 0 },
        second: { xPercent: -6, yPercent: -4 },
        third: { xPercent: 6, yPercent: 4 },
      },
      {
        first: { xPercent: 0, yPercent: 0 },
        second: { xPercent: -3, yPercent: 2 },
        third: { xPercent: 3, yPercent: -2 },
      },
      {
        first: { xPercent: 3, yPercent: 3 },
        second: { xPercent: -5, yPercent: -3 },
        third: { xPercent: 3, yPercent: -2 },
      },
      {
        first: { xPercent: -7, yPercent: -6 },
        second: { xPercent: 8, yPercent: 7 },
        third: { xPercent: -5, yPercent: -4 },
      },
    ] as const;
    const zoomPresets = [
      { first: 1.42, second: 1.74 },
      { first: 1.36, second: 1.62 },
      { first: 1.14, second: 1.23 },
      { first: 1.14, second: 1.24 },
    ] as const;
    const timingPresets = [
      {
        firstDuration: 0.78,
        secondDuration: 1.75,
        thirdDuration: 1.65,
        resetDuration: 0.8,
        repeatDelay: 0.18,
        startDelay: 0.12,
      },
      {
        firstDuration: 0.82,
        secondDuration: 1.12,
        thirdDuration: 1.08,
        resetDuration: 0.78,
        repeatDelay: 0.22,
        startDelay: 0.78,
      },
      {
        firstDuration: 0.9,
        secondDuration: 1.25,
        thirdDuration: 1.2,
        resetDuration: 0.82,
        repeatDelay: 0.16,
        startDelay: 1.32,
      },
      {
        firstDuration: 1.0,
        secondDuration: 1.4,
        thirdDuration: 1.25,
        resetDuration: 0.78,
        repeatDelay: 0.2,
        startDelay: 1.9,
      },
    ] as const;
    const preset = scanPresets[motionSeed % scanPresets.length] ?? scanPresets[0];
    const zoomPreset = zoomPresets[motionSeed % zoomPresets.length] ?? zoomPresets[0];
    const timingPreset = timingPresets[motionSeed % timingPresets.length] ?? timingPresets[0];
    const isTimelineTour = motionSeed % scanPresets.length === 0;

    gsap.set(image, {
      transformOrigin: "center center",
      scale: 1,
      xPercent: 0,
      yPercent: 0,
    });

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      gsap.set(image, { scale: 1, xPercent: 0, yPercent: 0 });
      return () => {
        gsap.killTweensOf(image);
      };
    }

    const timeline = gsap.timeline({
      repeat: -1,
      repeatDelay: timingPreset.repeatDelay,
      delay: timingPreset.startDelay,
    });
    const zoomInEase = "power3.inOut";
    const tourEase = "power2.inOut";

    timeline
      .to(image, {
        scale: zoomPreset.first,
        xPercent: preset.first.xPercent,
        yPercent: preset.first.yPercent,
        duration: timingPreset.firstDuration,
        ease: zoomInEase,
      })
      .to(image, {
        scale: zoomPreset.second,
        xPercent: preset.second.xPercent,
        yPercent: preset.second.yPercent,
        duration: timingPreset.secondDuration,
        ease: tourEase,
      })
      .to(image, {
        scale: zoomPreset.second,
        xPercent: preset.third.xPercent,
        yPercent: preset.third.yPercent,
        duration: timingPreset.thirdDuration,
        ease: tourEase,
      });

    if (isTimelineTour) {
      timeline
        .to(image, {
          scale: zoomPreset.second + 0.04,
          xPercent: -8,
          yPercent: 5,
          duration: 1.35,
          ease: tourEase,
        })
        .to(image, {
          scale: zoomPreset.second + 0.08,
          xPercent: 9,
          yPercent: -4,
          duration: 1.28,
          ease: tourEase,
        })
        .to(image, {
          scale: zoomPreset.second + 0.03,
          xPercent: -3,
          yPercent: 6,
          duration: 1.18,
          ease: tourEase,
        });
    }

    timeline.to(image, {
      scale: 1,
      xPercent: 0,
      yPercent: 0,
      duration: timingPreset.resetDuration,
      ease: tourEase,
    });

    return () => {
      timeline.kill();
      gsap.killTweensOf(image);
    };
  }, [motionSeed]);

  return (
    <div className="landing-feature-grid-image-viewport">
      <img ref={imageRef} src={src} alt={alt} className="landing-feature-grid-image" loading="lazy" />
    </div>
  );
}
