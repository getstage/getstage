import type { Project } from "../../models/project";

export function MoodboardTab({ project }: { project: Project }) {
  return (
    <section className="rounded-[8px] bg-[#F5F5F5] p-[8px] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
      <div className="px-[12px] py-[12px]">
        <h2 className="font-heading text-[16px] font-semibold text-[#0A0A0A]">Collect References</h2>
        <p className="mt-[8px] max-w-[700px] text-[13px] leading-[1.5] text-[#525252]">
          Drop in screenshots or paste a Figma link. Stage extracts structural
          patterns, while design decisions stay with you.
        </p>
      </div>

      <div className="rounded-[6px] bg-white p-[28px] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
        <div className="inline-flex rounded-[6px] bg-[#F5F5F5] p-[2px]">
          <button type="button" className="rounded-[5px] bg-white px-[12px] py-[8px] text-[13px] font-medium text-[#0A0A0A] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
            Figma Link
          </button>
          <button type="button" className="px-[12px] py-[8px] text-[13px] font-medium text-[#737373]">
            Upload from Device
          </button>
        </div>
        <label className="mt-[22px] block max-w-[360px]">
          <span className="mb-[8px] block text-[13px] font-medium text-[#0A0A0A]">Paste Figma</span>
          <span className="block rounded-[6px] bg-[#F5F5F5] px-[12px] py-[12px] text-[13px] text-[#737373]">
            ex. www.google.com
          </span>
        </label>
      </div>

      <div className="mt-[6px] rounded-[6px] bg-white p-[28px] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
        <p className="mb-[22px] text-[14px] font-medium text-[#0A0A0A]">
          {project.moodboard.references.length + 7} references collected
        </p>
        <div className="grid gap-[12px] md:grid-cols-3">
          {project.moodboard.references.map((reference) => (
            <article key={reference.id} className="overflow-hidden rounded-[8px] border border-[#E5E5E5] bg-white">
              <div className="flex aspect-[1.35] items-center justify-center bg-[#E5E5E5] text-[#525252]">
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-[24px] w-[24px]">
                  <rect x="4" y="5" width="12" height="10" rx="1.5" />
                  <path d="M6 13l3-3 2 2 1.5-1.5L16 14" />
                </svg>
              </div>
              <div className="p-[14px]">
                <h3 className="text-[15px] font-medium text-[#0A0A0A]">{reference.title}</h3>
                <div className="mt-[8px] flex items-center justify-between text-[12px] text-[#737373]">
                  <span>{reference.source}</span>
                  <span>{reference.date}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="mt-[6px] flex justify-end rounded-[6px] bg-white p-[14px] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
        <button type="button" className="rounded-[6px] bg-gradient-to-b from-[#6B5AE7] to-[#4F43B5] px-[18px] py-[10px] text-[13px] font-medium text-white">
          Create Moodboard
        </button>
      </div>
    </section>
  );
}
