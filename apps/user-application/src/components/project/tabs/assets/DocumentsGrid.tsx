import { DEFAULT_DOCUMENTS } from "@/lib/project/assetsTab";
import { CalendarIcon, ResearchReportIcon } from "./assetsIcons";

export function DocumentsGrid() {
  return (
    <div className="grid gap-1 lg:grid-cols-2">
      {DEFAULT_DOCUMENTS.map((document) => (
        <article
          key={document.id}
          className="flex min-h-[70px] items-start justify-between rounded-[8px] bg-white p-4 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]"
        >
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[4px] bg-[#DBEAFE] p-1 text-[#1D4ED8]">
              <ResearchReportIcon />
            </div>

            <div className="min-w-0">
              <div className="flex min-w-0 flex-wrap items-center gap-1">
                <h3 className="truncate text-[13px] font-medium leading-[1.25] text-[#171717]">
                  {document.title}
                </h3>
                <span className={`rounded-[2px] px-[6px] py-[2px] text-[12px] font-normal leading-[1.25] ${document.statusClass}`}>
                  {document.status}
                </span>
              </div>
              <p className="mt-1 truncate text-[12px] font-normal leading-[1.25] text-[#525252]">
                {document.description}
              </p>
              <div className="mt-2 flex items-center gap-2 text-[12px] font-medium leading-[1.25] text-[#737373]">
                <CalendarIcon />
                <span>{document.date}</span>
              </div>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
