import type { ReactNode } from "react";
import type { ProjectCategory } from "@stage/data-ops/contracts";
import { FlowIcon, ScreenIcon } from "./flowsIcons";
import { ScreenFilter } from "./ScreenFilter";

export type FlowPanel = "flows" | "screens";

// The Flows "details" header: approval progress, the canvas switch, and the Flows / Screens tabs.
// Stage for Mac adds its own actions (add flow, send to FigJam) through `actions`.
export function FlowsDetailsHeader({ category, flowTotal, approvedCount, screenTotal, panel, onPanelChange, onViewCanvas, actions }: {
  category: ProjectCategory;
  flowTotal: number;
  approvedCount: number;
  screenTotal: number;
  panel: FlowPanel;
  onPanelChange: (panel: FlowPanel) => void;
  onViewCanvas: () => void;
  actions?: ReactNode;
}) {
  const label = category === "websites" ? "Sitemap" : "Flows";
  const progress = flowTotal > 0 ? (approvedCount / flowTotal) * 100 : 0;
  const tabClass = (active: boolean) => `inline-flex h-[32px] items-center gap-2 rounded-[6px] px-3 text-[13px] font-medium leading-[1.25] transition-colors ${
    active ? "bg-[#E5E5E5] text-[#171717] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]" : "text-[#737373] hover:bg-[#F5F5F5]"
  }`;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div className="min-w-0">
          <h2 className="font-heading text-[15px] font-medium leading-[1.25] text-[#171717]">{label}</h2>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-[13px] font-medium leading-[1.25] text-[#171717]">
            <div className="h-[10px] w-[65px] overflow-hidden rounded-full bg-[#E5E5E5]">
              <div className="h-full rounded-full bg-[#16A34A]" style={{ width: `${progress}%` }} />
            </div>
            <span>{approvedCount} of {flowTotal} {category === "websites" ? "sitemaps" : "flows"} approved</span>
            <span className="h-1 w-1 rounded-full bg-[#D4D4D4]" aria-hidden="true" />
            <span className="text-[#737373]">{screenTotal} Unique screens identified</span>
          </div>
        </div>

        {panel === "flows" ? (
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={onViewCanvas} className="h-8 rounded-[6px] bg-white px-3 text-[13px] font-medium text-[#525252] shadow-sm">
              View canvas
            </button>
            {actions}
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-1 rounded-[8px] bg-white p-[2px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
          <button type="button" onClick={() => onPanelChange("flows")} className={tabClass(panel === "flows")}>
            <FlowIcon />
            {label}
            <span className="text-[#737373]">({flowTotal})</span>
          </button>
          <button type="button" onClick={() => onPanelChange("screens")} className={tabClass(panel === "screens")}>
            <ScreenIcon />
            Screens
            <span>({screenTotal})</span>
          </button>
        </div>

        {panel === "screens" ? <ScreenFilter screenTotal={screenTotal} /> : null}
      </div>
    </>
  );
}
