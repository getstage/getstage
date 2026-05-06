import type { CompanionState } from "@shared/models/desktop";

type CompanionOrbProps = {
  state: CompanionState;
};

export function CompanionOrb({ state }: CompanionOrbProps) {
  return (
    <button className="companion-orb" aria-label={`Stage companion is ${state}`}>
      <span className="companion-orb-mark">
        <img src="/logos/stage.svg" alt="" aria-hidden="true" />
      </span>
    </button>
  );
}
