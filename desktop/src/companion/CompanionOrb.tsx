import type { CompanionState } from "@shared/models/desktop";

type CompanionOrbProps = {
  state: CompanionState;
};

export function CompanionOrb({ state }: CompanionOrbProps) {
  return (
    <button className="companion-orb" aria-label={`Stage companion is ${state}`}>
      <span />
    </button>
  );
}
