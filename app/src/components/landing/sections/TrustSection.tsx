import { ClockCountdown, Lightning, SealCheck } from "@phosphor-icons/react";

export function TrustSection() {
  return (
    <section className="landing-trust">
      <div className="landing-container">
        <div className="landing-trust-grid">
          <div>
            <div className="landing-trust-icon" aria-hidden="true">
              <Lightning weight="duotone" />
            </div>
            <div className="landing-trust-title">Lightweight setup</div>
            <div className="landing-trust-desc">Under 5kb, won't slow your workflow</div>
          </div>
          <div>
            <div className="landing-trust-icon" aria-hidden="true">
              <ClockCountdown weight="duotone" />
            </div>
            <div className="landing-trust-title">One-minute onboarding</div>
            <div className="landing-trust-desc">Create your first project in 60 seconds</div>
          </div>
          <div>
            <div className="landing-trust-icon" aria-hidden="true">
              <SealCheck weight="duotone" />
            </div>
            <div className="landing-trust-title">No complexity</div>
            <div className="landing-trust-desc">Built for creatives, not enterprise teams</div>
          </div>
        </div>
      </div>
    </section>
  );
}
