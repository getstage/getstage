import { ArrowRightIcon } from "./moodboardIcons";

export function Footer({
  hasMoodboard,
  canAddToMoodboard,
  onAddToMoodboard,
}: {
  hasMoodboard: boolean;
  canAddToMoodboard: boolean;
  onAddToMoodboard: () => void;
}) {
  return (
    <div className="flex shrink-0 items-center justify-end rounded-[8px] bg-white px-4 py-3 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
      <button
        type="button"
        disabled={!canAddToMoodboard && !hasMoodboard}
        className={`inline-flex h-8 items-center justify-center gap-2 rounded-[6px] border border-[rgba(158,153,248,0.75)] bg-gradient-to-b from-[#7B76DF] to-[#463FBA] py-2 pl-[10px] pr-3 text-[13px] font-medium leading-[1.25] text-[#FAFAFA] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-opacity ${
          canAddToMoodboard || hasMoodboard ? "cursor-pointer hover:opacity-95" : "cursor-not-allowed opacity-50"
        }`}
        onClick={hasMoodboard ? undefined : onAddToMoodboard}
      >
        {hasMoodboard ? "Continue to flows" : canAddToMoodboard ? "Add to Moodboard" : "Create Moodboard"}
        <ArrowRightIcon />
      </button>
    </div>
  );
}
