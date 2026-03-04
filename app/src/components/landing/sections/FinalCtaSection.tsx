import { Link } from "@tanstack/react-router";

export function FinalCtaSection() {
  return (
    <section className="landing-final-cta">
      <div className="landing-container">
        <div className="landing-final-card">
          <h2 className="landing-section-title">Clarity for every creative project</h2>
          <p className="landing-section-subtitle">
            Start tracking your projects today. Free to begin, upgrade when you're ready.
          </p>
          <div className="landing-final-buttons">
            <Link to="/auth" className="landing-btn landing-btn-cta">
              Get started
            </Link>
            <a href="#features" className="landing-btn landing-btn-ghost landing-btn-secondary">
              See demo
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
