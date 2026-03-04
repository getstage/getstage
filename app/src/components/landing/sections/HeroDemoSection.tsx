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
