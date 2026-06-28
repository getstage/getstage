import { useEffect, useState } from "react";
import { DoneCircleIcon, PendingIcon, SpinnerIcon } from "./wireframesIcons";

function formatElapsed(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function GeneratingStep() {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const startedAt = Date.now();
    const intervalId = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, []);

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
        <span className="mt-1 font-mono text-[13px] font-medium tabular-nums leading-[1.5] text-[#737373]">
          Elapsed {formatElapsed(elapsedSeconds)}
        </span>
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
