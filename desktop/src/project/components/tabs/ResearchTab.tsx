import type { Project } from "../../models/project";

export function ResearchTab({ project }: { project: Project }) {
  return (
    <section className="rounded-[12px] bg-[#F5F5F5] p-1 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
      <div className="flex items-center justify-between p-4">
        <div className="min-w-0">
          <h2 className="text-[15px] font-medium leading-none text-[#171717]">
            Configure Research
          </h2>
          <p className="mt-1 max-w-[385px] text-[12px] font-medium leading-[1.5] text-[#737373]">
            Provide context about the client and their market. The more you give, the better the research.
          </p>
        </div>
      </div>

      <div className="rounded-[8px] bg-white py-[44px] pl-[44px] pr-[clamp(44px,31vw,400px)] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
        <div className="flex w-full flex-col gap-6">
          <MockField
            label="Industry"
            value="e.g. Fintech, E-commerce, SaaS, Health"
          />
          <MockField
            label="Client Website"
            value={project.research.clientWebsite || "ex. www.google.com"}
          />
          <MockArea
            label="Project Brief or Context"
            value={project.research.brief || "Type here..."}
            action="Upload Brief"
            tall
          />
          <MockField
            label="Specific Competitors to include"
            value={project.research.competitors[0] ?? "ex. www.competitor.com"}
            action="Add"
          />
          <MockArea
            label="Additional notes"
            value={project.research.notes || "https://Baseframe.com"}
          />
        </div>

        <div className="mt-6 flex items-start gap-3">
          <button
            type="button"
            className="h-[35px] rounded-[6px] bg-[#F5F5F5] px-[10px] py-[10px] text-[13px] font-medium leading-none text-[#525252] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#ECECEC]"
          >
            Cancel
          </button>
          <button
            type="button"
            className="inline-flex h-[35px] items-center justify-center gap-2 rounded-[6px] border border-[rgba(158,153,248,0.75)] bg-gradient-to-b from-[#7B76DF] to-[#463FBA] px-[10px] py-[10px] text-[13px] font-medium leading-none text-[#FAFAFA] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-opacity hover:opacity-95"
          >
            <SparkleIcon />
            Run Research
          </button>
        </div>
      </div>
    </section>
  );
}

function MockField({
  label,
  value,
  action,
}: {
  label: string;
  value: string;
  action?: string;
}) {
  return (
    <label className="block w-full">
      <span className="mb-2 block text-[13px] font-medium leading-none text-[#171717]">{label}</span>
      {action ? (
        <span className="flex h-[29px] w-[290px] items-center justify-between overflow-hidden rounded-[8px] bg-[#F5F5F5] py-[2px] pl-3 pr-[2px] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
          <span className="truncate text-[12px] font-medium leading-none text-[#525252]">
            {value}
          </span>
          <button
            type="button"
            className="inline-flex h-[25px] shrink-0 items-center gap-[6px] rounded-[6px] border border-[#525252] bg-gradient-to-b from-[#404040] to-[#0A0A0A] px-[10px] text-[12px] font-medium leading-none text-[#FAFAFA] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]"
          >
            <PlusIcon />
            {action}
          </button>
        </span>
      ) : (
        <span className="flex h-[35px] w-[290px] items-center overflow-hidden rounded-[6px] bg-[#F5F5F5] px-3 py-[10px] text-[12px] font-medium leading-none text-[#525252] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
          {value}
        </span>
      )}
    </label>
  );
}

function MockArea({
  label,
  value,
  action,
  tall,
}: {
  label: string;
  value: string;
  action?: string;
  tall?: boolean;
}) {
  return (
    <label className="block w-full">
      <span className="mb-2 block text-[13px] font-medium leading-none text-[#171717]">{label}</span>
      <span
        className={`flex flex-col overflow-hidden rounded-[6px] bg-[#F5F5F5] px-3 py-[10px] text-[12px] font-medium leading-none text-[#525252] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] ${
          tall ? "h-[114px] w-full justify-between" : "h-[92px] w-[370px]"
        }`}
      >
        <span>{value}</span>
        {action ? (
          <button
            type="button"
            className="inline-flex h-[28px] w-fit items-center justify-center gap-2 rounded-[6px] bg-[#F5F5F5] py-[6px] pl-[10px] pr-3 text-[13px] font-medium leading-none text-[#171717] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#ECECEC]"
          >
            <UploadIcon />
            {action}
          </button>
        ) : null}
      </span>
    </label>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="h-4 w-4">
      <path d="M8 3.5v9M3.5 8h9" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className="h-[15px] w-[15px]">
      <path d="M7.4 2.4a.6.6 0 0 1 1.2 0l.32 2.47a2.3 2.3 0 0 0 1.96 1.96l2.47.32a.6.6 0 0 1 0 1.2l-2.47.32a2.3 2.3 0 0 0-1.96 1.96l-.32 2.47a.6.6 0 0 1-1.2 0l-.32-2.47a2.3 2.3 0 0 0-1.96-1.96l-2.47-.32a.6.6 0 0 1 0-1.2l2.47-.32a2.3 2.3 0 0 0 1.96-1.96L7.4 2.4Z" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
      <path d="M2.75 4.5A1.75 1.75 0 0 1 4.5 2.75h2.04c.46 0 .9.18 1.24.51l.96.96c.1.1.24.16.39.16h2.37a1.75 1.75 0 0 1 1.75 1.75v5.37a1.75 1.75 0 0 1-1.75 1.75h-7A1.75 1.75 0 0 1 2.75 11.5v-7Zm4.72 6.03a.75.75 0 0 0 1.06 0l1.75-1.75a.75.75 0 1 0-1.06-1.06l-.47.47V6.75a.75.75 0 0 0-1.5 0v1.44l-.47-.47a.75.75 0 1 0-1.06 1.06l1.75 1.75Z" />
    </svg>
  );
}
