import type { Project } from "../../models/project";

export function ResearchTab({ project }: { project: Project }) {
  return (
    <section className="rounded-[8px] bg-[#F5F5F5] p-[8px] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
      <div className="flex items-start justify-between gap-4 px-[12px] py-[10px]">
        <div>
          <h2 className="font-heading text-[16px] font-semibold text-[#0A0A0A]">Configure Research</h2>
          <p className="mt-[4px] max-w-[560px] text-[13px] leading-[1.4] text-[#525252]">
            Provide context about the client and their market. The more you give,
            the better the first research run will be.
          </p>
        </div>
        <span className="rounded-[6px] bg-[#FFF2EB] px-[10px] py-[6px] text-[12px] font-medium text-[#DD6B4D]">
          First run starts with Claude
        </span>
      </div>

      <div className="rounded-[6px] bg-white p-[28px] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
        <div className="grid max-w-[720px] gap-[18px]">
          <MockField label="Client Website" value={project.research.clientWebsite} />
          <MockField label="Upload a Brief" value="Upload Document · PDF, DOCX, PPT etc." />
          <MockField
            label="Specific Competitors to include"
            value={project.research.competitors[0] ?? "ex. www.google.com"}
            action="+ Add"
          />
          <MockField
            label="Reference links"
            value={project.research.references[0] ?? "ex. www.google.com"}
          />
          <MockArea label="Additional notes" value={project.research.notes} compact />
          <MockArea label="Project Brief or Context" value={project.research.brief} />
        </div>

        <div className="mt-[22px] flex justify-end gap-[8px]">
          <button type="button" className="rounded-[6px] bg-gradient-to-b from-[#6B5AE7] to-[#4F43B5] px-[14px] py-[9px] text-[13px] font-medium text-white">
            Run Research
          </button>
          <button type="button" className="rounded-[6px] bg-[#F5F5F5] px-[14px] py-[9px] text-[13px] font-medium text-[#525252]">
            Cancel
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
    <label className="block">
      <span className="mb-[7px] block text-[13px] font-medium text-[#0A0A0A]">{label}</span>
      <span className="flex max-w-[320px] items-center gap-[8px]">
        <span className="flex min-h-[38px] flex-1 items-center rounded-[6px] bg-[#F5F5F5] px-[12px] text-[12px] font-medium text-[#525252]">
          {value}
        </span>
        {action ? (
          <button type="button" className="rounded-[6px] bg-[#0A0A0A] px-[10px] py-[8px] text-[12px] font-medium text-white">
            {action}
          </button>
        ) : null}
      </span>
    </label>
  );
}

function MockArea({
  label,
  value,
  compact,
}: {
  label: string;
  value: string;
  compact?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-[7px] block text-[13px] font-medium text-[#0A0A0A]">{label}</span>
      <span
        className={`block rounded-[6px] bg-[#F5F5F5] px-[12px] py-[12px] text-[12px] font-medium text-[#525252] ${
          compact ? "min-h-[72px] max-w-[360px]" : "min-h-[96px] max-w-[760px]"
        }`}
      >
        {value}
      </span>
    </label>
  );
}
