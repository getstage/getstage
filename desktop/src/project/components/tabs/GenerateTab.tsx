export function GenerateTab() {
  return (
    <section className="grid gap-[12px] md:grid-cols-[0.9fr_1.1fr]">
      <div className="rounded-[8px] bg-[#F5F5F5] p-[8px] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
        <h2 className="px-[12px] py-[10px] font-heading text-[16px] font-semibold text-[#0A0A0A]">Generate</h2>
        <div className="rounded-[6px] bg-white p-[20px] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
          <label className="block">
            <span className="mb-[8px] block text-[13px] font-medium text-[#0A0A0A]">Prompt</span>
            <span className="block min-h-[160px] rounded-[6px] bg-[#F5F5F5] p-[14px] text-[13px] leading-[1.55] text-[#525252]">
              Generate a first brand direction using the latest research, strategy,
              and collected references.
            </span>
          </label>
          <button type="button" className="mt-[16px] rounded-[6px] bg-gradient-to-b from-[#6B5AE7] to-[#4F43B5] px-[18px] py-[10px] text-[13px] font-medium text-white">
            Generate Direction
          </button>
        </div>
      </div>

      <div className="rounded-[8px] bg-[#F5F5F5] p-[8px] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
        <h2 className="px-[12px] py-[10px] font-heading text-[16px] font-semibold text-[#0A0A0A]">Generated concepts</h2>
        <div className="grid gap-[8px]">
          {["Minimal conversion system", "Editorial product story", "Founder-led launch page"].map((concept) => (
            <article key={concept} className="rounded-[6px] bg-white p-[18px] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
              <h3 className="text-[15px] font-semibold text-[#0A0A0A]">{concept}</h3>
              <p className="mt-[6px] text-[13px] leading-[1.5] text-[#737373]">
                Mock generation result for the desktop design pass.
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
