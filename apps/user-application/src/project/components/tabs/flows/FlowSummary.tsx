import type { ProjectFlow } from "../../../models/project";
import { ScreenIcon } from "./flowsIcons";

export function FlowSummary({
  flow,
  index,
  expanded,
}: {
  flow: ProjectFlow;
  index: number;
  expanded: boolean;
}) {
  return (
    <>
      <span className="flex h-[22px] min-w-[22px] shrink-0 items-center justify-center rounded-[4px] bg-[#E5E5E5] px-2 py-1 text-[12px] font-medium leading-[1.25] text-[#171717]">
        {index}
      </span>
      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-1">
          <h3 className="truncate text-[13px] font-medium leading-[1.25] text-[#171717]">
            {flow.title}
          </h3>
          <span className="inline-flex h-[20px] items-center rounded-[2px] bg-[#F0FDF4] px-[6px] text-[12px] font-normal leading-[1.25] text-[#022C22]">
            {flow.status}
          </span>
        </div>
        <p className="mt-2 text-[12px] font-normal leading-[1.25] text-[#525252]">
          {flow.description}
        </p>

        {expanded ? (
          <div className="mt-3 flex flex-wrap items-center gap-3 text-[12px] font-medium leading-[1.25] text-[#737373]">
            {flow.category ? (
              <span className="inline-flex h-[20px] items-center rounded-[2px] bg-[#F3E8FF] px-[6px] text-[#581C87]">
                {flow.category}
              </span>
            ) : null}
            <span className="h-1 w-1 rounded-full bg-[#D4D4D4]" aria-hidden="true" />
            <span className="inline-flex items-center gap-2 py-[6px]">
              <ScreenIcon size={13} />
              {flow.screenCount ?? 0} Screens
            </span>
          </div>
        ) : null}
      </div>
    </>
  );
}
