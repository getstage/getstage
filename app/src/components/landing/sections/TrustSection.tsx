import { ClockCountdown, SealCheck, UsersThree } from "@phosphor-icons/react";

export function TrustSection() {
  return (
    <section className="landing-trust">
      <div className="landing-container">
        <div className="landing-trust-grid">
          <div>
            <div className="landing-trust-icon" aria-hidden="true">
              <ClockCountdown weight="duotone" />
            </div>
            <div className="landing-trust-title">One-minute onboarding</div>
            <div className="landing-trust-desc">Create your first project in 60 seconds</div>
          </div>
          <div>
            <div className="landing-trust-icon" aria-hidden="true">
              <UsersThree weight="duotone" />
            </div>
            <div className="landing-trust-title">300+ people on the waitlist</div>
            <div className="landing-trust-desc">Join early users shaping the next version of Stage</div>
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
