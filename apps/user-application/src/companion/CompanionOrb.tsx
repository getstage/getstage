import type { CompanionState } from "@shared/models/desktop";

type CompanionOrbProps = {
  state: CompanionState;
};

export function CompanionOrb({ state }: CompanionOrbProps) {
  return (
    <a
      className="companion-orb"
      href="https://tally.so/r/OD0gqM"
      target="_blank"
      rel="noreferrer"
      aria-label={`Open Stage companion form. Stage companion is ${state}`}
    >
      <span className="companion-orb-tooltip">Share feedback</span>
      <span className="companion-orb-mark">
        <img src="/logos/stage.svg" alt="" aria-hidden="true" />
      </span>
    </a>
  );
}
