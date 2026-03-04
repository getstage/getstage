import { Link } from "@tanstack/react-router";

export function FinalCtaSection() {
  return (
    <section className="landing-final-cta">
      <div className="landing-final-lattice">
        <div className="landing-final-lattice-row landing-final-lattice-row-top" aria-hidden="true">
          {Array.from({ length: 9 }).map((_, index) => (
            <div key={index} className="landing-final-lattice-cell" />
          ))}
        </div>

        <div className="landing-final-lattice-row landing-final-lattice-row-content">
          <div className="landing-final-lattice-cell" aria-hidden="true" />

          <article className="landing-final-card">
            <div className="landing-final-plan-head">
              <h2 className="landing-section-title landing-final-title">
                Clarity for every creative project
              </h2>
              <p className="landing-section-subtitle landing-final-description">
                Start tracking your projects today. Free to begin, upgrade when you're ready.
              </p>
            </div>

            <div className="landing-final-buttons">
              <Link to="/auth" className="landing-btn landing-btn-cta landing-final-primary-cta">
                Get started
              </Link>

              <a
                href="#features"
                className="landing-btn landing-btn-ghost landing-btn-secondary landing-final-secondary-cta"
              >
                See demo
              </a>
            </div>
          </article>

          <div className="landing-final-lattice-cell" aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}
