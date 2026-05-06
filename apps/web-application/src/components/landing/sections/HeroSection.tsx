import { Link } from "@tanstack/react-router";

export function HeroSection() {
  return (
    <section className="landing-hero">
      <div className="landing-container">
        <a href="#pricing" className="landing-hero-badge" aria-label="Go to pricing">
          <span className="landing-hero-badge-pill">50% off</span>
          <span className="landing-hero-badge-text">Yearly launch pricing</span>
          <span className="landing-hero-badge-arrow" aria-hidden="true">
            ›
          </span>
        </a>
        <h1 className="landing-hero-title">The calm way to run client projects</h1>
        <p className="landing-hero-subtitle">
          Stage gives designers and freelancers one clear place to plan phases, track progress,
          share client updates, and stay on top of payments.
        </p>
        <div className="landing-hero-buttons">
          <Link to="/auth" className="landing-btn landing-btn-cta">
            Start free
          </Link>
          <a href="#demo" className="landing-btn landing-btn-ghost landing-btn-secondary">
            See demo
          </a>
        </div>
      </div>
    </section>
  );
}
