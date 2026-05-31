import { DoneCircleIcon, PendingIcon, SpinnerIcon } from "./wireframesIcons";

export function GeneratingStep() {
  return (
    <div className="flex w-[330px] flex-col items-center gap-6 text-center">
      <div className="flex h-11 w-11 items-center justify-center text-[#5B4FE0]">
        <img
          src="/logos/dashboard/creating-wireframe.svg"
          alt=""
          aria-hidden="true"
          className="h-11 w-11 shrink-0"
        />
      </div>
      <div className="flex w-full flex-col items-center gap-2">
        <h2 className="text-[16px] font-semibold leading-[1.25] text-[#171717]">Creating Wireframe</h2>
        <p className="w-[282px] text-[13px] font-medium leading-[1.5] text-[#525252]">
          Hold tight, we&apos;re building your wireframes based on the moodboard and
        </p>
      </div>
      <div className="flex flex-col items-start gap-2 text-[13px] font-medium leading-[1.5] text-[#525252]">
        <ProgressRow done label="Scanned Moodboard" />
        <ProgressRow done label="Scanned Flows" />
        <ProgressRow loading label="Creating Layouts" />
        <ProgressRow label="Create Wireframes" />
      </div>
    </div>
  );
}

export function ProgressRow({
  done,
  loading,
  label,
}: {
  done?: boolean;
  loading?: boolean;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-[18px] w-[18px] items-center justify-center">
        {done ? <DoneCircleIcon /> : loading ? <SpinnerIcon /> : <PendingIcon />}
      </span>
      <span>{label}</span>
    </div>
  );
}
