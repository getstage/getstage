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
    <div className="flex flex-col items-center justify-center gap-4 py-10">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(135,130,245,0.08)]">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-7 w-7 text-accent"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
      <div className="font-heading text-[22px] font-semibold tracking-[-0.3px] text-text-primary">
        Project created!
      </div>
      <div className="mt-[-4px] text-[14px] text-text-secondary">
        Your roadmap is ready to go.
      </div>
      <button
        type="button"
        onClick={onViewProject}
        className="mt-3 w-full cursor-pointer rounded-[10px] bg-accent px-4 py-[13px] text-[15px] font-medium text-white transition-colors hover:bg-accent-hover"
      >
        View Project
      </button>
    </div>
  );
}
