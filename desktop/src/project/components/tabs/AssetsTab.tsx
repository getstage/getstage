import type { Project } from "../../models/project";

export function AssetsTab({ project }: { project: Project }) {
  return (
    <section className="rounded-[8px] bg-[#F5F5F5] p-[8px] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
      <div className="flex items-center justify-between px-[12px] py-[10px]">
        <div>
          <h2 className="font-heading text-[16px] font-semibold text-[#0A0A0A]">Assets</h2>
          <p className="mt-[4px] text-[13px] text-[#737373]">Approved files and references for this project.</p>
        </div>
        <button type="button" className="rounded-[6px] bg-white px-[14px] py-[9px] text-[13px] font-medium text-[#262626] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
          Upload Asset
        </button>
      </div>
      <div className="grid gap-[8px] rounded-[6px] bg-white p-[20px] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] md:grid-cols-3">
        {project.assets.map((asset) => (
          <article key={asset.id} className="rounded-[8px] border border-[#E5E5E5] bg-[#FAFAFA] p-[16px]">
            <div className="mb-[18px] flex aspect-[1.4] items-center justify-center rounded-[6px] bg-[#E5E5E5] text-[#737373]">
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-[24px] w-[24px]">
                <rect x="4" y="5" width="12" height="10" rx="1.5" />
                <path d="M6 13l3-3 2 2 1.5-1.5L16 14" />
              </svg>
            </div>
            <h3 className="text-[15px] font-semibold text-[#0A0A0A]">{asset.title}</h3>
            <p className="mt-[4px] text-[13px] text-[#737373]">{asset.type}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
