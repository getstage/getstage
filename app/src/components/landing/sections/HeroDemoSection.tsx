import demoImage from "@/assets/landing-images/demo.webp";
import heroBgImage from "@/assets/landing-images/hero-bg.webp";
import { INTEGRATION_ICONS } from "./data";

export function HeroDemoSection() {
  return (
    <section className="landing-hero-demo-section" aria-label="Stage demo">
      <div
        className="landing-hero-demo-bg"
        style={{ backgroundImage: `url(${heroBgImage})` }}
        aria-hidden="true"
      />
      <svg
        className="landing-hero-clip-defs"
        width="0"
        height="0"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <clipPath id="landing-hero-demo-strip-clip" clipPathUnits="objectBoundingBox">
            <path d="M0 0H1L0.950085 0.861851C0.945349 0.943624 0.930201 1 0.912961 1H0.087039C0.0698 1 0.05465 0.943624 0.049914 0.861851L0 0Z" />
          </clipPath>
        </defs>
      </svg>
      <div className="landing-hero-integration-strip">
        <span className="landing-hero-integration-label">Integrate with</span>
        <div className="landing-hero-integration-icons">
          {INTEGRATION_ICONS.map((icon) => (
            <span key={`hero-int-${icon.name}`} className="landing-hero-integration-logo">
              <img src={icon.src} alt={icon.name} loading="lazy" />
            </span>
          ))}
        </div>
      </div>
      <div className="landing-container landing-hero-demo-wrap">
        <div className="landing-hero-mockup">
          <img
            src={demoImage}
            alt="Stage dashboard demo"
            className="landing-hero-demo-image"
            loading="eager"
          />
        </div>
      </div>
    </section>
  );
}
