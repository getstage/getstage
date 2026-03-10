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
            <div className="landing-trust-title">Set up in under a minute</div>
            <div className="landing-trust-desc">
              Create your first project fast and start tracking real work right away.
            </div>
          </div>
          <div>
            <div className="landing-trust-icon" aria-hidden="true">
              <UsersThree weight="duotone" />
            </div>
            <div className="landing-trust-title">300+ people on the waitlist</div>
            <div className="landing-trust-desc">Early users are already shaping what comes next.</div>
          </div>
          <div>
            <div className="landing-trust-icon" aria-hidden="true">
              <SealCheck weight="duotone" />
            </div>
            <div className="landing-trust-title">No enterprise bloat</div>
            <div className="landing-trust-desc">
              Just the workflow freelancers and small studios actually need.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
