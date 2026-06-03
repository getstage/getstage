import { useEffect, useState } from "react";
import {
  clearUpstreamStale,
  readUpstreamStale,
  type UpstreamStaleKind,
} from "@/lib/project/upstreamStaleFlag";

type UpstreamStaleBannerProps = {
  projectId: string;
  onGoToResearch?: () => void;
  onGoToStrategy?: () => void;
};

function messageForKind(kind: UpstreamStaleKind) {
  if (kind === "research") {
    return "Research was updated. This step may be out of date — review Research and regenerate Strategy when ready.";
  }

  return "Strategy was updated. This step may be out of date — review Strategy when ready.";
}

export function UpstreamStaleBanner({
  projectId,
  onGoToResearch,
  onGoToStrategy,
}: UpstreamStaleBannerProps) {
  const [kind, setKind] = useState<UpstreamStaleKind | null>(() => readUpstreamStale(projectId));

  useEffect(() => {
    setKind(readUpstreamStale(projectId));
  }, [projectId]);

  if (!kind) {
    return null;
  }

  function dismiss() {
    clearUpstreamStale(projectId);
    setKind(null);
  }

  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3 rounded-[8px] border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3">
      <p className="max-w-[640px] text-[13px] font-medium leading-[1.5] text-[#92400E]">
        {messageForKind(kind)}
      </p>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {kind === "research" && onGoToResearch ? (
          <button
            type="button"
            onClick={onGoToResearch}
            className="text-[12px] font-medium text-[#92400E] underline underline-offset-2"
          >
            Open Research
          </button>
        ) : null}
        {onGoToStrategy ? (
          <button
            type="button"
            onClick={onGoToStrategy}
            className="text-[12px] font-medium text-[#92400E] underline underline-offset-2"
          >
            Open Strategy
          </button>
        ) : null}
        <button
          type="button"
          onClick={dismiss}
          className="rounded-[6px] bg-[#FEF3C7] px-2 py-1 text-[12px] font-medium text-[#92400E]"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
