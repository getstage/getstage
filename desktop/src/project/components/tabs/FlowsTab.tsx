import type { Project } from "../../models/project";

export function FlowsTab({ project }: { project: Project }) {
  return (
    <section className="grid gap-[12px] md:grid-cols-3">
      {project.flows.map((flow) => (
        <article key={flow.id} className="rounded-[8px] bg-[#F5F5F5] p-[8px] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
          <div className="rounded-[6px] bg-white p-[18px] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
            <div className="mb-[18px] flex items-center justify-between gap-[12px]">
              <span className="rounded-full bg-[#E8E6FF] px-[10px] py-[4px] text-[12px] font-medium text-[#4F43B5]">
                {flow.status}
              </span>
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-[20px] w-[20px] text-[#737373]">
                <path d="M5 5h4v4H5zM11 11h4v4h-4z" />
                <path d="M9 7h3a2 2 0 012 2v2" />
              </svg>
            </div>
            <h2 className="text-[16px] font-semibold text-[#0A0A0A]">{flow.title}</h2>
            <p className="mt-[8px] text-[13px] leading-[1.5] text-[#525252]">{flow.description}</p>
          </div>
        </article>
      ))}
    </section>
  );
}
