export function GeneratingState() {
  return (
    <div className="flex flex-col items-center justify-center gap-5 py-20">
      <div className="flex gap-1.5">
        <span className="h-2 w-2 animate-[pulse_1.2s_ease-in-out_infinite] rounded-full bg-accent" />
        <span className="h-2 w-2 animate-[pulse_1.2s_ease-in-out_0.2s_infinite] rounded-full bg-accent" />
        <span className="h-2 w-2 animate-[pulse_1.2s_ease-in-out_0.4s_infinite] rounded-full bg-accent" />
      </div>
      <div className="text-[15px] text-text-secondary">Creating your roadmap...</div>
    </div>
  );
}

type SuccessStateProps = {
  onViewProject: () => void;
};

export function SuccessState({ onViewProject }: SuccessStateProps) {
  return (
    <div className="rounded-[12px] bg-[#F5F5F5] p-1 shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
      <div className="flex flex-col items-center justify-center gap-8 rounded-[8px] bg-gradient-to-b from-[rgba(158,153,248,0.16)] via-white to-white px-6 py-[72px] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
        <img src="/logos/stage-logo-light.png" alt="Stage" className="h-[22px] w-auto" />
        <div className="text-center">
          <div className="font-heading text-[18px] font-semibold leading-[1.2] text-text-primary">
            Project Created!
          </div>
          <div className="mt-2 text-[12px] font-medium leading-[1.5] text-text-secondary">
            Your roadmap is ready to go.
          </div>
        </div>
        <button
          type="button"
          onClick={onViewProject}
          className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-[6px] border border-[rgba(158,153,248,0.75)] bg-gradient-to-b from-[#7B76DF] to-[#463FBA] px-6 py-[10px] text-[13px] font-medium text-white shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] transition-opacity hover:opacity-95"
        >
          View Project <span>→</span>
        </button>
      </div>
    </div>
  );
}
