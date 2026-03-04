import { Link } from "@tanstack/react-router";

export function HeroSection() {
  return (
    <section className="landing-hero">
      <div className="landing-container">
        <Link to="/auth" className="landing-hero-badge" aria-label="Go to login">
          <span className="landing-hero-badge-pill">NEW</span>
          <span className="landing-hero-badge-text">Just launched v1</span>
          <span className="landing-hero-badge-arrow" aria-hidden="true">
            ›
          </span>
        </Link>
        <h1 className="landing-hero-title">Project clarity for designers and freelancers</h1>
        <p className="landing-hero-subtitle">
          Track projects, manage phases, monitor payments. Everything you need to run your creative
          work — without the chaos.
        </p>
        <div className="landing-hero-buttons">
          <Link to="/auth" className="landing-btn landing-btn-cta">
            Get started
          </Link>
          <a href="#features" className="landing-btn landing-btn-ghost landing-btn-secondary">
            See demo
          </a>
        </div>
      </div>
    </section>
  );
}
