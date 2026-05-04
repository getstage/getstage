export function StrategyTab() {
  return (
    <section className="grid gap-[12px] md:grid-cols-[1.1fr_0.9fr]">
      <div className="rounded-[8px] bg-[#F5F5F5] p-[8px] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
        <h2 className="px-[12px] py-[10px] font-heading text-[16px] font-semibold text-[#0A0A0A]">
          Strategy Summary
        </h2>
        <div className="rounded-[6px] bg-white p-[24px] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
          <p className="text-[18px] font-semibold text-[#1B1B2F]">
            Clean, confident, and conversion-focused.
          </p>
          <p className="mt-[10px] max-w-[620px] text-[14px] leading-[1.6] text-[#525252]">
            The visual direction should feel minimal but not empty. The brand should
            lead with clear hierarchy, restrained color, and fast paths to action.
          </p>
          <div className="mt-[22px] grid gap-[8px] sm:grid-cols-3">
            {["Trust", "Clarity", "Momentum"].map((item) => (
              <div key={item} className="rounded-[6px] bg-[#F5F5F5] px-[14px] py-[16px] text-[14px] font-medium text-[#262626]">
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-[8px] bg-[#F5F5F5] p-[8px] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
        <h2 className="px-[12px] py-[10px] font-heading text-[16px] font-semibold text-[#0A0A0A]">
          Approved Direction
        </h2>
        <div className="rounded-[6px] bg-white p-[24px] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
          <div className="flex items-center gap-[8px]">
            {["#8782F5", "#0A0A0A", "#F5F5F5", "#DD7B5F"].map((color) => (
              <span key={color} className="h-[42px] w-[42px] rounded-full shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]" style={{ background: color }} />
            ))}
          </div>
          <p className="mt-[18px] text-[13px] leading-[1.55] text-[#737373]">
            Mock strategy content copied into desktop for design review. Real AI
            generation and persistence stay out of this phase.
          </p>
        </div>
      </div>
    </section>
  );
}
